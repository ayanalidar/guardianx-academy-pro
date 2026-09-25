/**
 * NOTE: deliberately NOT marked "use client". This module contains only
 * plain functions and a string constant - no components or hooks - so both
 * server components (importing RESET_INLINE_SCRIPT) and client components
 * (importing resetOfflineData) can use it directly. Marking it "use client"
 * would turn every export into an opaque client reference on the server,
 * breaking the inline-script import in app/reset/page.tsx.
 */

/**
 * Client-side offline-data reset - the self-service escape hatch.
 *
 * Why: a browser tab that loaded a buggy build weeks ago can end up wedged
 * (old service worker + old caches + old localStorage keys). Every later fix
 * we ship only helps once that browser executes NEW code, which historically
 * required the user to know about hard-refreshes. This helper gives any
 * loaded page a one-click way to fully clear the client-side state:
 *
 *   1. unregister every service worker
 *   2. delete every Cache Storage bucket
 *   3. remove all GuardianX localStorage/sessionStorage keys
 *
 * Auth session cookies are intentionally left alone (NextAuth handles them;
 * clearing cookies here would log people out as a side effect of a UI fix).
 * After the sweep, the caller reloads/redirects - the next load is guaranteed
 * to be a fresh build with a fresh worker.
 */

const KNOWN_KEYS = [
  "gx-catalog-cache-v1",
  "gx_build_id",
  "gx_build_reload_at",
  "gx_chunk_reload",
  "gx_sw_reload_at",
]

function sweepStorage() {
  try {
    const ls = window.localStorage
    KNOWN_KEYS.forEach((k) => { try { ls.removeItem(k) } catch { /* ignore */ } })
    // Defensive: also drop any other gx-prefixed keys we may add later.
    const doomed: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k && k.startsWith("gx-")) doomed.push(k)
    }
    doomed.forEach((k) => { try { ls.removeItem(k) } catch { /* ignore */ } })
  } catch { /* storage blocked - nothing cached there anyway */ }

  try {
    const ss = window.sessionStorage
    KNOWN_KEYS.forEach((k) => { try { ss.removeItem(k) } catch { /* ignore */ } })
  } catch { /* ignore */ }
}

async function sweepWorkersAndCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
    }
  } catch { /* ignore */ }

  try {
    if (typeof window.caches !== "undefined") {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => {})))
    }
  } catch { /* ignore */ }
}

/**
 * Full sweep. Resolves once every step has settled (or been skipped).
 * Does NOT navigate - the caller owns the redirect/reload.
 */
export async function resetOfflineData(): Promise<void> {
  sweepStorage()
  await sweepWorkersAndCaches()
}

/** Same vanilla-JS sweep as a string, for inline <script> use in RSC pages. */
export const RESET_INLINE_SCRIPT = `
(function(){
  var KEYS=["gx-catalog-cache-v1","gx_build_id","gx_build_reload_at","gx_chunk_reload","gx_sw_reload_at"];
  try{
    var ls=window.localStorage;
    KEYS.forEach(function(k){try{ls.removeItem(k)}catch(e){}});
    var doomed=[];for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&k.indexOf("gx-")===0)doomed.push(k)}
    doomed.forEach(function(k){try{ls.removeItem(k)}catch(e){}})
  }catch(e){}
  try{KEYS.forEach(function(k){try{window.sessionStorage.removeItem(k)}catch(e){}})}catch(e){}
  try{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.getRegistrations().then(function(rs){
        rs.forEach(function(r){try{r.unregister()}catch(e){}})
      }).catch(function(){})
    }
  }catch(e){}
  try{
    if(window.caches&&caches.keys){
      caches.keys().then(function(ks){ks.forEach(function(k){try{caches.delete(k)}catch(e){}})}).catch(function(){})
    }
  }catch(e){}
})();
`
