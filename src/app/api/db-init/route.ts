import { honeypotRoute } from "@/lib/honeypot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * HONEYPOT - fake "database initialisation" endpoint. Never touches the real
 * database; every request (GET or POST) is logged to SecurityEvent.
 */
const { GET, POST } = honeypotRoute({
  decoy: "db-init",
  payload: {
    ok: true,
    service: "db-initialiser",
    initialized: true,
    migrated: true,
    tables: ["users_decoy", "courses_decoy", "orders_decoy"],
    seeded: true,
    note: "SYNTHETIC DECOY - GuardianX security honeypot. This endpoint initialises nothing.",
    _honeypot: "GuardianX decoy - this endpoint is instrumented; all access is logged.",
  },
})

export { GET, POST }
