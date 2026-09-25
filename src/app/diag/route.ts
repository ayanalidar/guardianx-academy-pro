import { readFileSync } from "node:fs"
import path from "node:path"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * /diag - one-visit client diagnostics for "I can't see courses / uploads fail".
 *
 * WHY A ROUTE HANDLER (not a page):
 *  - Returns a COMPLETE standalone HTML document. It does not import the app
 *    shell, does not load app chunks, does not need React hydration. Even a
 *    tab pinned to a dead build that 404s every /_next chunk can still run
 *    this page's inline vanilla JS.
 *  - Stamps `X-GX-Build` on the response. The page compares the build that
 *    was DELIVERED to the browser against the build /api/health reports from
 *    origin. A mismatch is definitive proof the preview edge-gateway is
 *    serving a pinned stale entry - previously invisible from the outside.
 *
 * New paths are never in a gateway cache, so /diag always reaches origin.
 */

function readBuildId(): string {
  try {
    return readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim()
  } catch {
    return "unknown"
  }
}

const PAGE_SHELL = String.raw`
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>GuardianX - Client Diagnostics</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; background:#070b14; color:#e2e8f0;
         font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; }
  .wrap { width:100%; max-width:680px; }
  .head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .logo { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center;
          background:rgba(139,92,246,.12); border:1px solid rgba(139,92,246,.35); font-size:19px; }
  h1 { font-size:17px; margin:0; }
  .sub { color:#7c8699; font-size:12px; margin-top:2px; }
  #verdict { border-radius:14px; padding:16px 18px; margin-bottom:14px; border:1px solid #232c3d; background:#0d1424; }
  #verdict h2 { margin:0 0 6px; font-size:15px; }
  #verdict p { margin:0; color:#9aa6bb; font-size:13px; line-height:1.55; }
  #verdict.red    { border-color:rgba(244,63,94,.45);  background:rgba(244,63,94,.08); }
  #verdict.amber  { border-color:rgba(245,158,11,.45); background:rgba(245,158,11,.08); }
  #verdict.green  { border-color:rgba(16,185,129,.45); background:rgba(16,185,129,.08); }
  .card { border:1px solid #1c2536; background:#0b1120; border-radius:12px; overflow:hidden; margin-bottom:12px; }
  .row { display:flex; align-items:flex-start; gap:10px; padding:11px 14px; border-bottom:1px solid #131b2b; }
  .row:last-child { border-bottom:0; }
  .pill { flex:0 0 auto; font-size:10.5px; font-weight:600; letter-spacing:.04em; border-radius:999px;
          padding:3px 9px; margin-top:1px; text-transform:uppercase; white-space:nowrap; }
  .pill.wait  { background:rgba(148,163,184,.12); color:#94a3b8; }
  .pill.ok    { background:rgba(16,185,129,.14); color:#34d399; }
  .pill.warn  { background:rgba(245,158,11,.14); color:#fbbf24; }
  .pill.bad   { background:rgba(244,63,94,.14);  color:#fb7185; }
  .row .lbl { font-weight:600; font-size:13px; }
  .row .det { color:#8b96ab; font-size:12px; margin-top:2px; word-break:break-word; }
  .actions { display:flex; gap:10px; flex-wrap:wrap; margin:16px 0 4px; }
  button { cursor:pointer; border-radius:10px; padding:10px 16px; font-size:13px; font-weight:600; border:1px solid transparent; }
  .b-primary { background:#7c3aed; color:#fff; } .b-primary:hover { background:#6d28d9; }
  .b-ghost { background:transparent; color:#a5b0c3; border-color:#26314a; } .b-ghost:hover { color:#e2e8f0; }
  .b-green { background:#059669; color:#fff; } .b-green:hover { background:#047857; }
  .foot { color:#5b657a; font-size:11.5px; margin-top:14px; line-height:1.6; }
  #report { width:100%; height:120px; margin-top:10px; background:#0b1120; color:#8b96ab;
            border:1px solid #1c2536; border-radius:10px; padding:8px; font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; display:none; }
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <div class="logo">🛡️</div>
    <div>
      <h1>GuardianX - Client Diagnostics</h1>
      <div class="sub">Run this page if courses don't appear or uploads fail. No data leaves your browser.</div>
    </div>
  </div>

  <div id="verdict">
    <h2>Running checks…</h2>
    <p>Comparing the build this page was served from against the live origin, then probing the catalog API, your session, service workers and caches.</p>
  </div>

  <div class="card">
    <div class="row"><span class="pill wait" id="p-page">WAIT</span><div><div class="lbl">This page's build (as delivered to you)</div><div class="det" id="d-page">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-origin">WAIT</span><div><div class="lbl">Live origin build (/api/health)</div><div class="det" id="d-origin">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-cat">WAIT</span><div><div class="lbl">Course catalog API (/api/courses)</div><div class="det" id="d-cat">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-me">WAIT</span><div><div class="lbl">Your session (/api/me)</div><div class="det" id="d-me">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-sw">WAIT</span><div><div class="lbl">Service workers registered on this origin</div><div class="det" id="d-sw">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-cache">WAIT</span><div><div class="lbl">Cache storage buckets</div><div class="det" id="d-cache">checking…</div></div></div>
    <div class="row"><span class="pill wait" id="p-ls">WAIT</span><div><div class="lbl">App storage keys (gx-*)</div><div class="det" id="d-ls">checking…</div></div></div>
  </div>

  <div class="actions">
    <button class="b-green" id="b-catalog">Open the course catalog</button>
    <button class="b-primary" id="b-repair">Force repair this browser</button>
    <button class="b-ghost" id="b-copy">Copy report</button>
  </div>
  <textarea id="report" readonly></textarea>
  <div class="foot">
    "Force repair" unregisters service workers, deletes cached pages and clears app storage keys, then reloads the catalog.
    Your password and login cookie are not touched. If the verdict above says the delivered build is stale, run the repair,
    then reload this page - if it still reports stale, the preview gateway is pinning an old copy; waiting a few minutes or
    reopening the preview link usually clears it.
  </div>
</div>

<script>
window.__GX_PAGE_BUILD__ = "__BUILD_ID__";
(function () {
  var STATE = {}
  function el(id) { return document.getElementById(id) }
  function setPill(id, cls, text) { var n = el(id); if (!n) return; n.className = "pill " + cls; n.textContent = text }
  function setDet(id, text) { var n = el(id); if (n) n.textContent = text }

  async function jget(url) {
    var t0 = performance.now()
    var res = await fetch(url, { cache: "no-store", credentials: "include" })
    var ms = Math.round(performance.now() - t0)
    var text = await res.text()
    var json = null
    try { json = JSON.parse(text) } catch (e) {}
    return { ok: res.ok, status: res.status, ms: ms, json: json }
  }

  function verdict(kind, title, body) {
    var v = el("verdict")
    v.className = kind
    v.innerHTML = "<h2>" + title + "</h2><p>" + body + "</p>"
  }

  async function run() {
    var pageBuild = window.__GX_PAGE_BUILD__ || "unknown"
    var originBuild = null, health = null, cat = null, me = null

    setPill("p-page", "ok", "BUILD")
    setDet("d-page", pageBuild)

    try {
      health = await jget("/api/health")
      if (health.json && health.json.buildId) originBuild = health.json.buildId
      var dbPart = health.json && health.json.db ? ("db " + (health.json.db.ok ? "ok" : "DOWN")) : ""
      var cPart = health.json && health.json.counts ? (" · " + health.json.counts.courses + " courses in DB") : ""
      setPill("p-origin", health.ok ? "ok" : "bad", health.ok ? "OK" : "DOWN")
      setDet("d-origin", "build " + (originBuild || "?") + " · " + health.status + " in " + health.ms + "ms" + (dbPart ? " · " + dbPart : "") + cPart)
    } catch (e) {
      setPill("p-origin", "bad", "DOWN")
      setDet("d-origin", "unreachable: " + e.message)
    }

    try {
      cat = await jget("/api/courses")
      var n = cat.json && cat.json.courses ? cat.json.courses.length : null
      STATE.catalogCount = n
      if (cat.ok && n !== null) {
        setPill("p-cat", n > 0 ? "ok" : "warn", n > 0 ? (n + " COURSES") : "EMPTY")
        setDet("d-cat", "HTTP " + cat.status + " in " + cat.ms + "ms - your browser received " + n + " courses from the API")
      } else {
        setPill("p-cat", "bad", "FAIL")
        setDet("d-cat", "HTTP " + cat.status + " in " + cat.ms + "ms - response was not a course list")
      }
    } catch (e) {
      setPill("p-cat", "bad", "FAIL")
      setDet("d-cat", "request threw: " + e.message)
    }

    try {
      me = await jget("/api/me")
      var u = me.json && me.json.user
      STATE.user = u ? (u.email + " (" + u.role + ")") : null
      if (u) {
        setPill("p-me", "ok", u.role)
        setDet("d-me", "signed in as " + u.email)
      } else {
        setPill("p-me", "warn", "LOGGED OUT")
        setDet("d-me", "no session cookie reached the server - admin tools and uploads will be blocked")
      }
    } catch (e) {
      setPill("p-me", "bad", "FAIL")
      setDet("d-me", "request threw: " + e.message)
    }

    var swDesc = "none registered"
    var swCount = 0
    try {
      var regs = await navigator.serviceWorker.getRegistrations()
      swCount = regs.length
      swDesc = swCount === 0 ? "none registered" : regs.map(function (r) { return r.scope + " → " + (r.active ? r.active.scriptURL : "installing") }).join(" | ")
      setPill("p-sw", swCount === 0 ? "ok" : "warn", swCount === 0 ? "NONE" : swCount)
    } catch (e) { setPill("p-sw", "warn", "N/A"); swDesc = "unavailable: " + e.message }
    setDet("d-sw", swDesc)
    STATE.sw = swDesc

    var cacheDesc = "none"
    try {
      if (window.caches) {
        var keys = await caches.keys()
        cacheDesc = keys.length === 0 ? "none" : keys.join(", ")
        setPill("p-cache", keys.length === 0 ? "ok" : "warn", keys.length)
      } else { setPill("p-cache", "ok", "NONE") }
    } catch (e) { setPill("p-cache", "warn", "N/A"); cacheDesc = "unavailable: " + e.message }
    setDet("d-cache", cacheDesc)
    STATE.caches = cacheDesc

    var lsDesc = "none"
    try {
      var gx = []
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("gx-") === 0) gx.push(k) }
      lsDesc = gx.length === 0 ? "none" : gx.join(", ")
      setPill("p-ls", gx.length === 0 ? "ok" : "warn", gx.length)
    } catch (e) { setPill("p-ls", "warn", "N/A"); lsDesc = "unavailable: " + e.message }
    setDet("d-ls", lsDesc)
    STATE.localStorage = lsDesc

    var stale = pageBuild !== "unknown" && originBuild && pageBuild !== originBuild

    if (stale) {
      verdict("red",
        "Stale build detected - your browser was served an old copy",
        "This page was delivered as build <b>" + pageBuild + "</b> but the live origin is build <b>" + originBuild + "</b>. " +
        "Everything else below may look fine and the app can still be broken. Press <b>Force repair this browser</b>, then reload this page. " +
        "If it still reports stale after that, the preview gateway is holding an old entry - give it a few minutes and reload.")
    } else if (cat && cat.ok && STATE.catalogCount === 0) {
      verdict("amber",
        "You are on the current build, but the catalog API returned 0 courses",
        "Origin health reports courses in the database, yet the catalog endpoint returned an empty list to your browser. " +
        "Copy the report below and send it back - that combination pinpoints the failing layer.")
    } else if (cat && !cat.ok) {
      verdict("red",
        "The catalog API is failing from your browser",
        "/api/courses answered HTTP " + cat.status + ". If origin health is OK, something between your browser and the server " +
        "(gateway or network) is altering the response. Copy the report below and send it back.")
    } else if (STATE.user === null) {
      verdict("amber",
        "Catalog works - but you are signed out",
        "Your browser is not sending a session the server recognizes (" + (STATE.catalogCount || 0) + " courses came through fine). " +
        "Browsing works signed-out, but uploading courses requires signing in again. If signing in loops, press Force repair, then sign in.")
    } else {
      verdict("green",
        "All green - build, catalog and session are healthy",
        "Delivered build matches origin (" + pageBuild + "), the catalog API returned " + STATE.catalogCount + " courses, and you are signed in as " + STATE.user + ". " +
        "If a page still looks wrong, it is a one-off render glitch: press Force repair and reload. With ?go=1 in the address this page auto-continues to the catalog.")

      var params = new URLSearchParams(location.search)
      if (params.get("go") === "1") {
        setTimeout(function () { location.replace("/courses?t=" + Date.now()) }, 1200)
      }
    }

    STATE.pageBuild = pageBuild
    STATE.originBuild = originBuild
    STATE.userAgent = navigator.userAgent
    STATE.time = new Date().toISOString()
    STATE.url = location.href
  }

  async function forceRepair() {
    try { var regs = await navigator.serviceWorker.getRegistrations(); for (var i = 0; i < regs.length; i++) regs[i].unregister() } catch (e) {}
    try { if (window.caches) { var keys = await caches.keys(); for (var j = 0; j < keys.length; j++) await caches.delete(keys[j]) } } catch (e) {}
    try {
      var kill = []
      for (var k = 0; k < localStorage.length; k++) { var key = localStorage.key(k); if (key && key.indexOf("gx-") === 0) kill.push(key) }
      for (var m = 0; m < kill.length; m++) localStorage.removeItem(kill[m])
      sessionStorage.clear()
    } catch (e) {}
    location.replace("/courses?t=" + Date.now())
  }

  async function copyReport() {
    var lines = [
      "GuardianX diagnostics report",
      "time: " + (STATE.time || new Date().toISOString()),
      "url: " + location.href,
      "pageBuild: " + (STATE.pageBuild || window.__GX_PAGE_BUILD__),
      "originBuild: " + (STATE.originBuild || "?"),
      "catalogCount: " + (STATE.catalogCount === undefined ? "?" : STATE.catalogCount),
      "session: " + (STATE.user || "logged out"),
      "serviceWorkers: " + (STATE.sw || "?"),
      "cacheBuckets: " + (STATE.caches || "?"),
      "gxKeys: " + (STATE.localStorage || "none"),
      "userAgent: " + navigator.userAgent
    ]
    var text = lines.join("\n")
    var ta = el("report")
    ta.value = text
    ta.style.display = "block"
    var ok = false
    try { await navigator.clipboard.writeText(text); ok = true } catch (e) {}
    if (!ok) { ta.focus(); ta.select(); try { ok = document.execCommand("copy") } catch (e) {} }
    var b = el("b-copy")
    b.textContent = ok ? "Copied ✓" : "Copied to box below - paste it back"
    if (!ok) return
    setTimeout(function () { b.textContent = "Copy report" }, 2500)
  }

  el("b-repair").addEventListener("click", function () { forceRepair() })
  el("b-copy").addEventListener("click", function () { copyReport() })
  el("b-catalog").addEventListener("click", function () { location.href = "/courses?t=" + Date.now() })
  run()
})()
</script>
</body>
</html>
`

export async function GET() {
  // audit fix V-03: the diagnostics tool is for signed-in users troubleshooting
  // their session - anonymous visitors get a sign-in nudge instead of the tool.
  const viewer = await getCurrentUser().catch(() => null)
  if (!viewer) {
    return new Response(
      `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><title>Diagnostics - sign in required</title></head><body style="font-family:system-ui;background:#0f0b1e;color:#e9e4f5;display:grid;place-items:center;min-height:100vh"><div style="text-align:center"><h1 style="font-size:18px">Sign in required</h1><p style="font-size:14px;color:#9b93b3">Diagnostics are available to signed-in accounts.<br>Please sign in, then reload this page.</p></div></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } }
    )
  }
  const buildId = readBuildId()
  const html = PAGE_SHELL.replace("__BUILD_ID__", buildId)
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "X-GX-Build": buildId,
      "X-Robots-Tag": "noindex",
    },
  })
}
