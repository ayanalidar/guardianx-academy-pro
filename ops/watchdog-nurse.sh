#!/usr/bin/env bash
# GuardianX Academy - Watchdog nurse: (re)start the host watchdog if it died.
# Safe to call repeatedly (cron entry, deploy hook, or manual). Usage:
#   npm run watchdog:nurse
set -u
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${GX_WATCHDOG_LOG:-/home/z/my-project/watchdog.log}"
PIDFILE="${GX_WATCHDOG_PIDFILE:-/home/z/my-project/watchdog.pid}"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "[nurse] watchdog already running (pid $(cat "$PIDFILE"))"
  exit 0
fi

if pgrep -f "ops/watchdog.py" | grep -qv $$; then
  echo "[nurse] watchdog already running (pgrep match)"
  exit 0
fi

nohup python3 "$REPO/ops/watchdog.py" >> "$LOG" 2>&1 &
echo $! > "$PIDFILE"
echo "[nurse] started host watchdog (pid $(cat "$PIDFILE"), log $LOG)"
