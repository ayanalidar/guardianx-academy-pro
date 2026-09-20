"use client"

/**
 * MobileTabBar — fixed bottom navigation for logged-in users on <lg screens.
 *
 * Four primary destinations (role-aware first tab), rendered only for app
 * surfaces so it never fights the marketing footer. Hides while the user
 * scrolls down (reappears on scroll up) and respects the safe-area inset.
 */

import * as React from "react"
import {
  LayoutDashboard, GraduationCap, FlaskConical, User, Shield,
  Presentation, Search,
} from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { viewToPath } from "@/lib/url-router"
import { roleHomeFor } from "@/lib/nav-data"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import type { View } from "@/store/app-store"

interface Tab {
  label: string
  icon: LucideIcon
  view: View
}

export function MobileTabBar() {
  const { view, navigate } = useAppStore()
  const { user } = useUser()
  const [hidden, setHidden] = React.useState(false)
  const lastY = React.useRef(0)

  /* hide on scroll down, show on scroll up */
  React.useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setHidden(y > lastY.current && y > 120)
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  /** Views where the tab bar makes sense (app surfaces, not marketing). */
  const NON_APP_VIEWS = new Set([
    "home", "impact", "contact", "login", "pricing", "blog", "blog-post",
    "verify", "cert-landing", "legal", "events", "event-detail", "cms",
  ])

  if (!user) return null
  if (NON_APP_VIEWS.has(view.name)) return null

  const role = user.role
  const staffHome = roleHomeFor(role)
  const isStaff = staffHome === "admin" || staffHome === "instructor"

  const tabs: Tab[] = isStaff
    ? [
        { label: "Console", icon: staffHome === "admin" ? Shield : Presentation, view: { name: staffHome } as View },
        { label: "Labs", icon: FlaskConical, view: { name: "labs" } },
        { label: "Search", icon: Search, view: { name: "catalog" } },
        { label: "Profile", icon: User, view: { name: "profile" } },
      ]
    : [
        { label: "Home", icon: LayoutDashboard, view: { name: "dashboard" } },
        { label: "Learning", icon: GraduationCap, view: { name: "learning" } },
        { label: "Labs", icon: FlaskConical, view: { name: "labs" } },
        { label: "Profile", icon: User, view: { name: "profile" } },
      ]

  const activePath = viewToPath(view)

  return (
    <nav
      aria-label="Primary mobile"
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/50 bg-background/85 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-transform duration-300",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const isActive = activePath === viewToPath(tab.view)
          const Icon = tab.icon
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => navigate(tab.view)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 outline-none",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/60",
                "transition-colors",
                isActive ? "text-cyan-300" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", isActive && "drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]")} aria-hidden />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
