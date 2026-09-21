/* Canonical production origin - single source of truth for
 * absolute URL construction (sitemaps, IndexNow pings, OG tags).
 * Env override lets preview deployments report their own origin. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://academy.guardianx.cloud"
).replace(/\/+$/, "");
