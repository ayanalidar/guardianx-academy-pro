import { honeypotRoute } from "@/lib/honeypot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * HONEYPOT - fake debug/config-dump endpoint. Never exposes real config;
 * every request is logged to SecurityEvent and flagged by the watchdog.
 */
const { GET, POST } = honeypotRoute({
  decoy: "debug",
  payload: {
    ok: true,
    service: "debug-console",
    environment: "production",
    node: "v22.0.0",
    flags: { verboseLogging: false, maintenanceMode: false, featureX: false },
    recentErrors: [{ ts: "2026-01-01T00:00:00.000Z", code: "E_DECOY", message: "synthetic entry" }],
    note: "SYNTHETIC DECOY - GuardianX security honeypot. No real configuration is served here.",
    _honeypot: "GuardianX decoy - this endpoint is instrumented; all access is logged.",
  },
})

export { GET, POST }
