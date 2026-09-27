#!/usr/bin/env python3
"""
GuardianX Academy - Host Watchdog v4 (sandbox/preview supervisor)
=================================================================

The serverless-side supervisor (src/lib/watchdog.ts) cannot restart host
processes - that is THIS script's job on the sandbox/preview host, where we
own the app process. It is the direct descendant of the v3 watchdog that was
lost to a sandbox reset: v4 lives IN THE REPO (ops/), so any future reset is
recovered with one command:

    npm run watchdog:nurse     # (re)start me, safe to call repeatedly
    npm run watchdog:once      # single diagnostic cycle, no restarts

What it does every cycle (default 30s):
  1. Probes the local app: /api/health, /, /api/courses
  2. Every ~6 cycles runs a route sweep over key public pages
  3. If the app is down/unhealthy and GX_APP_CMD is set: restarts it,
     waits, re-probes, and VERIFIES recovery (verified-repair pattern)
  4. Writes the status file (default /home/z/my-project/watchdog-status.json)
     in the exact shape src/app/api/health/route.ts reads to display the
     supervision board on /status
  5. Escalates via exponential backoff (cap 10 min) when repairs keep failing

Configuration (env):
  GX_APP_URL      default http://127.0.0.1:3000
  GX_STATUS_FILE  default /home/z/my-project/watchdog-status.json
  GX_APP_CMD      shell command to (re)start the app, e.g.
                  "cd /home/z/my-project/repo-guardianx && nohup npx next start -p 3000"
                  Leave UNSET to supervise without restart powers (probe-only).
  GX_INTERVAL     seconds between cycles (default 30)
  GX_ROUTES       comma-separated extra routes for the sweep
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

APP_URL = os.environ.get("GX_APP_URL", "http://127.0.0.1:3000").rstrip("/")
STATUS_FILE = os.environ.get("GX_STATUS_FILE", "/home/z/my-project/watchdog-status.json")
APP_CMD = os.environ.get("GX_APP_CMD", "").strip()
INTERVAL = max(10, int(os.environ.get("GX_INTERVAL", "30")))
SWEEP_ROUTES = [r for r in os.environ.get("GX_ROUTES", "/,/courses,/status,/api/health").split(",") if r]
SWEEP_EVERY = 6  # cycles between route sweeps
RESTART_COOLDOWN = 120  # min seconds between app restarts
VERSION = 4

probes_state = {}  # name -> {"ok": bool, "ms": int}
actions = []       # recent self-healing actions (newest last, capped)
repairs = []       # (epoch, kind) for the 15-minute window counters
sweep_state = {"checked": 0, "bad": [], "ts": None}
start_iso = datetime.now(timezone.utc).isoformat()
cycle = 0
consecutive_failures = 0
last_restart_ts = 0.0


def log(msg: str) -> None:
    print(f"[{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}] {msg}", flush=True)


def fetch(path: str, timeout: float = 5.0):
    """GET APP_URL+path; returns (status_code, body_or_'')."""
    req = urllib.request.Request(
        APP_URL + path,
        headers={"user-agent": "GuardianX-HostWatchdog/4", "cache-control": "no-store"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, res.read(65536).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            body = e.read(65536).decode("utf-8", "replace")
        except Exception:
            body = ""
        return e.code, body
    except Exception as e:
        return 0, str(e)


def note_action(text: str) -> None:
    actions.append(f"{datetime.now(timezone.utc).strftime('%H:%M:%S')} {text}")
    del actions[:-20]


def note_repair(kind: str) -> None:
    now = time.time()
    repairs.append((now, kind))
    del repairs[:-50]


def repair_window_counts() -> dict:
    cutoff = time.time() - 15 * 60
    recent = [k for (ts, k) in repairs if ts >= cutoff]
    return {
        "restarts15m": sum(1 for k in recent if k == "restart"),
        "rebuilds": sum(1 for k in recent if k == "rebuild"),
        "reseeds": sum(1 for k in recent if k == "reseed"),
        "totalActions": len(recent),
    }


def write_status(healthy: bool, backoff_sec: int) -> None:
    data = {
        "version": VERSION,
        "ts": int(time.time()),
        "startIso": start_iso,
        "cycle": cycle,
        "healthy": healthy,
        "backoffSec": backoff_sec,
        "enabled": True,
        "probes": probes_state,
        "sweep": sweep_state,
        "repairs": repair_window_counts(),
        "actions": actions,
    }
    tmp = STATUS_FILE + ".tmp"
    try:
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f)
        os.replace(tmp, STATUS_FILE)
    except Exception as e:
        log(f"status write failed: {e}")


def restart_app() -> bool:
    """Restart the app via GX_APP_CMD; returns True when a restart was attempted."""
    global last_restart_ts
    if not APP_CMD:
        return False
    if time.time() - last_restart_ts < RESTART_COOLDOWN:
        return True  # cooled down - do not hammer
    last_restart_ts = time.time()
    log("repair ladder: restarting app via GX_APP_CMD")
    try:
        subprocess.run("pkill -f 'next (start|dev)' || true", shell=True, timeout=15)
        time.sleep(2)
        subprocess.Popen(APP_CMD, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
        note_action("restarted app (watchdog ladder)")
        note_repair("restart")
        return True
    except Exception as e:
        log(f"restart failed: {e}")
        note_action(f"restart failed: {e}")
        return False


def one_cycle() -> bool:
    """Run one supervision cycle; returns overall health."""
    global cycle, consecutive_failures, sweep_state
    cycle += 1
    healthy = True

    # 1. Health endpoint probe
    code, body = fetch("/api/health")
    health_ok = code == 200 and '"ok":true' in body.replace(" ", "")
    probes_state["health"] = {"ok": health_ok, "ms": int(0)}
    if not health_ok:
        healthy = False
    if code == 200:
        try:
            data = json.loads(body)
            probes_state["health"]["ms"] = int(data.get("db", {}).get("latencyMs", 0))
            if data.get("ok") is False or data.get("db", {}).get("ok") is False:
                healthy = False
        except Exception:
            pass

    # 2. Feature probes
    for name, path in (("home", "/"), ("courses-api", "/api/courses")):
        c0 = time.time()
        code2, _ = fetch(path)
        ok = 200 <= code2 < 400
        probes_state[name] = {"ok": ok, "ms": int((time.time() - c0) * 1000)}
        if not ok:
            healthy = False

    # 3. Route sweep (periodic)
    if cycle % SWEEP_EVERY == 0:
        bad = []
        for r in SWEEP_ROUTES:
            code3, _ = fetch(r, timeout=8.0)
            if not (200 <= code3 < 400):
                bad.append(f"{r} ({code3 or 'err'})")
        sweep_state = {"checked": len(SWEEP_ROUTES), "bad": bad, "ts": datetime.now(timezone.utc).isoformat()}
        if bad:
            healthy = False

    # 4. Repair ladder (verified restart)
    if not healthy and APP_CMD and health_ok is False:
        attempted = restart_app()
        if attempted:
            time.sleep(min(20, INTERVAL))
            code4, body4 = fetch("/api/health")
            recovered = code4 == 200 and '"ok":true' in body4.replace(" ", "")
            note_action("restart verified: recovered" if recovered else "restart verified: STILL DOWN")
            if recovered:
                healthy = True
                consecutive_failures = 0

    # 5. Backoff bookkeeping
    if healthy:
        consecutive_failures = 0
        backoff = 0
    else:
        consecutive_failures += 1
        backoff = min(600, INTERVAL * (2 ** min(consecutive_failures, 5)))
        log(f"cycle {cycle}: UNHEALTHY (fails={consecutive_failures}, next backoff={backoff}s)")
    return healthy, backoff


def main() -> None:
    once = "--once" in sys.argv
    log(f"host watchdog v{VERSION} starting: app={APP_URL} status={STATUS_FILE} "
        f"interval={INTERVAL}s restarts={'on' if APP_CMD else 'off'}")
    while True:
        try:
            healthy, backoff = one_cycle()
            if healthy:
                log(f"cycle {cycle}: healthy")
            write_status(healthy, backoff)
        except Exception as e:
            log(f"cycle {cycle} crashed (watchdog must never die): {e}")
            try:
                write_status(False, INTERVAL)
            except Exception:
                pass
        if once:
            log("single cycle complete (--once)")
            return
        time.sleep(backoff if not healthy else INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("stopped by operator")
