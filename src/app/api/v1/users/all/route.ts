import { honeypotRoute } from "@/lib/honeypot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * HONEYPOT - fake "dump all users" v1 endpoint. Serves only self-labelled
 * synthetic rows (example.invalid addresses); every request is logged.
 */
const { GET, POST } = honeypotRoute({
  decoy: "v1-users-all",
  payload: {
    ok: true,
    total: 4,
    users: [
      { id: "hp-u-0001", name: "Decoy One", email: "decoy.one@example.invalid", role: "STUDENT" },
      { id: "hp-u-0002", name: "Decoy Two", email: "decoy.two@example.invalid", role: "STUDENT" },
      { id: "hp-u-0003", name: "Decoy Three", email: "decoy.three@example.invalid", role: "INSTRUCTOR" },
      { id: "hp-u-0004", name: "Decoy Four", email: "decoy.four@example.invalid", role: "ADMIN" },
    ],
    note: "SYNTHETIC DECOY - GuardianX security honeypot. These accounts do not exist.",
    _honeypot: "GuardianX decoy - this endpoint is instrumented; all access is logged.",
  },
})

export { GET, POST }
