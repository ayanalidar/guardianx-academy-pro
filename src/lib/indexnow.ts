/* ============================================================
   IndexNow — instant search-engine notification.

   IndexNow (indexnow.org) is supported by Bing, Naver, Yandex,
   Seznam and (via Bing) DuckDuckGo-ish endpoints. Submitting a
   URL list tells participating crawlers "these changed — recrawl
   now" instead of waiting days/weeks for organic discovery.

   Ownership is proven by a key file served at:
     https://academy.guardianx.cloud/<INDEXNOW_KEY>.txt
   (static file in public/ — must contain exactly the key string)
   ============================================================ */

import { SITE_URL } from "@/lib/site-url";

export const INDEXNOW_KEY = "gx7a4c2f9e1d54b8ba03f6c7d92e81a45";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Ping IndexNow with a batch of URLs (absolute). Fire-and-forget
 * safe: never throws — returns a compact status object for the
 * report UI instead. Skips silently when there are no URLs.
 */
export async function pingIndexNow(
  urlPaths: string[],
): Promise<{ submitted: number; status: number | null; ok: boolean; note?: string }> {
  const abs = Array.from(
    new Set(
      urlPaths
        .filter((p) => typeof p === "string" && p.startsWith("/"))
        .map((p) => `${SITE_URL}${p}`),
    ),
  ).slice(0, 100); // IndexNow allows up to 10k; stay conservative

  if (abs.length === 0) {
    return { submitted: 0, status: null, ok: true, note: "Nothing to ping" };
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: abs,
      }),
      // Don't let a slow ping hold the API response for long.
      signal: AbortSignal.timeout(8000),
    });
    // 200/202 = accepted; 400 = bad key/url; 403 = key not validated yet
    return {
      submitted: abs.length,
      status: res.status,
      ok: res.ok || res.status === 202,
      note:
        res.status === 403
          ? "Key pending first validation — search engines will validate the key file, then future pings are instant."
          : undefined,
    };
  } catch (e) {
    return {
      submitted: abs.length,
      status: null,
      ok: false,
      note: `Ping failed (${e instanceof Error ? e.message : "network"}) — URLs are still crawlable, retry next time.`,
    };
  }
}
