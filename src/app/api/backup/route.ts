import { honeypotRoute } from "@/lib/honeypot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * HONEYPOT - fake database-backup endpoint. Never holds real data; every
 * request is logged to SecurityEvent and flagged by the watchdog sweep.
 */
const { GET, POST } = honeypotRoute({
  decoy: "backup",
  payload: {
    ok: true,
    service: "database-backup",
    environment: "production",
    lastBackupAt: "2026-01-01T00:00:00.000Z",
    tables: 42,
    sizeMb: 128,
    rows: [
      { table: "users", count: 1337, preview: [{ id: "hp-0001", email: "decoy.one@example.invalid" }] },
      { table: "orders", count: 84, preview: [{ id: "hp-0002", total: 0 }] },
    ],
    note: "SYNTHETIC DECOY - GuardianX security honeypot. No real data is served at this endpoint.",
    _honeypot: "GuardianX decoy - this endpoint is instrumented; all access is logged.",
  },
})

export { GET, POST }
