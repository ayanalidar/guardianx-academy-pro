"use client"

/**
 * RoleGate — client-side RBAC wrapper for role-restricted SPA views.
 *
 * The API layer already enforces permissions server-side (requireRole /
 * requireAdmin return 401/403), but without a client gate a student who
 * opens `/admin-revenue` directly would still see the admin page chrome
 * full of failed widgets. RoleGate renders a branded "access restricted"
 * panel instead, with a CTA back to the viewer's own dashboard.
 *
 * Usage (view-router.tsx):
 *   <RoleGate allow={ROLES_ADMIN} area="Revenue Analytics">
 *     <RevenueAnalyticsView />
 *   </RoleGate>
 */

import * as React from "react"
import { ShieldAlert, ArrowRight, Loader2 } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { useUser } from "@/hooks/use-user"
import { roleHomeFor } from "@/lib/nav-data"
import type { View } from "@/store/app-store"
import { cn } from "@/lib/utils"

/** Roles that get the full admin console. */
export const ROLES_ADMIN = ["ADMIN", "SUPER_ADMIN"]
/** Roles allowed into instructor tooling (course studio, batch calendar…). */
export const ROLES_INSTRUCTOR = ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]

const ROLE_CHIP: Record<string, string> = {
  ADMIN: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  SUPER_ADMIN: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  INSTRUCTOR: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  STUDENT: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  INSTRUCTOR: "Instructor",
  SCHOOL_ADMIN: "School Admin",
  INSTITUTION_ADMIN: "Institution Admin",
  PROCTOR: "Proctor",
  STUDENT: "Student",
}

export function roleHomeView(role?: string | null): View {
  return { name: roleHomeFor(role) } as View
}

/* ============================================================
   AccessDeniedPanel — branded restricted screen
   ============================================================ */

export function AccessDeniedPanel({
  area,
  requiredRoles,
  className,
}: {
  area: string
  requiredRoles: string[]
  className?: string
}) {
  const { user } = useUser()
  const { navigate } = useAppStore()
  const role = user?.role ?? "STUDENT"
  const needsAdmin = requiredRoles.includes("ADMIN")

  return (
    <div className={cn("relative min-h-[80vh] flex items-center justify-center px-4", className)}>
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10 text-center max-w-md">
        <div className="inline-flex p-5 rounded-2xl border border-red-500/30 bg-red-500/10 mb-6">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <div className="text-[10px] font-mono text-red-400 tracking-[0.3em] mb-3">
          ACCESS RESTRICTED · {area.toUpperCase()}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-balance">
          {needsAdmin ? "Admin" : "Staff"} access required
        </h1>
        <p className="text-muted-foreground mb-6">
          {area} is only available to {needsAdmin ? "platform administrators" : "instructors and administrators"}.
          Your account is signed in as a different role — head back to your own dashboard; everything meant for you lives there.
        </p>
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(roleHomeView(role))}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            Go to my dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/40 text-xs text-muted-foreground">
            <span className="font-mono">Signed in as</span>
            <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider", ROLE_CHIP[role] ?? "bg-muted/30 text-muted-foreground border-border")}>
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   RoleGate — render children only for allowed roles
   ============================================================ */

export function RoleGate({
  allow,
  area,
  children,
}: {
  allow: string[]
  area: string
  children: React.ReactNode
}) {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
      </div>
    )
  }

  // Not logged in yet → AppRoot is responsible for the auth screen; render
  // nothing here so the gate never flashes a denied panel during login.
  if (!user) return null

  if (!allow.includes(user.role)) {
    return <AccessDeniedPanel area={area} requiredRoles={allow} />
  }

  return <>{children}</>
}
