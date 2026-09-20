"use client"

import * as React from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  Shield, User, LogOut, Menu, X,
  ChevronRight, Settings,
} from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { viewToPath } from "@/lib/url-router"
import { navForRole, type NavItem } from "@/lib/nav-data"
import { useUser } from "@/hooks/use-user"
import { useBatchLeadNotifications } from "@/hooks/use-batch-lead-notifications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/platform/notification-bell"
import { RouteProgress } from "@/components/platform/route-progress"
import { ViewEnter } from "@/components/platform/view-enter"
import { MobileTabBar } from "@/components/platform/mobile-tab-bar"
import { GlobalSearch } from "@/components/platform/global-search"
import { cn } from "@/lib/utils"

// Nav rendering is strictly role-based (see navForRole in @/lib/nav-data.ts):
//   ADMIN / SUPER_ADMIN → ADMIN_NAV, INSTRUCTOR → INSTRUCTOR_NAV, else STUDENT_NAV.
// Legacy alias removed — every surface now resolves through navForRole().

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    // Real anchor: middle-click/new-tab works, href visible, SPA nav on click.
    <a
      href="/"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (e.button !== 0) return
        e.preventDefault()
        useAppStore.getState().navigate({ name: "home" })
        onClick?.()
      }}
      className="flex items-center gap-2.5 group"
    >
      <div className="relative">
        <img
          src="/guardianx-logo-v2.png"
          alt="GuardianX"
          className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
          style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.6))" }}
          draggable={false}
        />
        <div className="absolute inset-0 bg-violet-500/30 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="text-left">
        <div className="font-bold text-lg leading-none tracking-tight">
          Guardian<span className="text-violet-400">X</span>
        </div>
        <div className="text-[9px] text-muted-foreground font-mono tracking-widest">SECURE · LEARN · DEFEND</div>
      </div>
    </a>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { view, navigate } = useAppStore()
  const { user } = useUser()
  const role = user?.role || "STUDENT"

  // Strict role separation — staff never see student items and vice versa.
  const items: NavItem[] = navForRole(role)

  function renderItem(item: NavItem, activeColor: string = "emerald") {
    const active = view.name === item.view.name
    const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
      emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", bar: "bg-emerald-400" },
      amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", bar: "bg-amber-400" },
      cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", bar: "bg-cyan-400" },
      violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", bar: "bg-violet-400" },
    }
    const c = colorMap[activeColor] || colorMap.emerald
    return (
      // Real anchor (was <button>): crawlable, open-in-new-tab, native semantics.
      <a
        key={item.label}
        href={viewToPath(item.view)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          if (e.button !== 0) return
          e.preventDefault()
          navigate(item.view)
          onNavigate?.()
        }}
        aria-current={active ? "page" : undefined}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative border",
          active
            ? `${c.bg} ${c.text} ${c.border}`
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent"
        )}
      >
        {active && <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r", c.bar)} />}
        <item.icon className={cn("h-4 w-4 shrink-0", active && c.text)} />
        <span className="flex-1 text-left">{item.label}</span>
        {active && <ChevronRight className="h-3.5 w-3.5" />}
      </a>
    )
  }

  return (
    <nav className="space-y-1">
      {/* Role-based nav items */}
      {items.map(item => {
        if (role === "ADMIN" || role === "SUPER_ADMIN") return renderItem(item, "amber")
        if (role === "INSTRUCTOR") return renderItem(item, "cyan")
        return renderItem(item, "emerald")
      })}
    </nav>
  )
}

function SidebarFooter() {
  const { user, stats, gamification } = useUser()
  const { navigate } = useAppStore()

  if (!user) return null

  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  return (
    <div className="mt-auto pt-4 border-t border-border/40 space-y-3">
      {/* User card */}
      <a
        href={viewToPath({ name: "profile" })}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          if (e.button !== 0) return
          e.preventDefault()
          navigate({ name: "profile" })
        }}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user.name?.charAt(0)?.toUpperCase() ?? "U"}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
        </div>
        <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </a>

      {/* ADMIN: System Admin badge + platform-control label (no XP bar) */}
      {isAdmin ? (
        <div className="px-2">
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-mono text-amber-300 tracking-[0.2em]">SYSTEM ADMIN</span>
              <span className="text-[9px] text-muted-foreground">Platform control</span>
            </div>
          </div>
        </div>
      ) : (
        /* Non-admin: XP / Level bar (existing behavior) */
        gamification && (
          <div className="px-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Level {gamification.level}</span>
              <span>{gamification.xp} XP</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${Math.min(100, (gamification.xp % 1000) / 10)}%` }} />
            </div>
          </div>
        )
      )}

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Sign Out</span>
      </button>

      {/* Footer */}
      <div className="px-2 pt-2 border-t border-border/30">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <Shield className="h-3 w-3 text-emerald-400" />
          <span>GuardianX LMS · v2.0.0</span>
        </div>
        <div className="text-[9px] text-muted-foreground/60 mt-1">© 2025 GuardianX Security Education</div>
      </div>
    </div>
  )
}

function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2">
            <img src="/guardianx-logo-v2.png" alt="GuardianX" className="h-7 w-7" draggable={false} />
            <span>Guardian<span className="text-violet-400">X</span></span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
        <div className="p-3 border-t border-border/40">
          <SidebarFooter />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  // Push notifications for admin — polls for new batch leads
  useBatchLeadNotifications()

  return (
    <div className="min-h-screen flex bg-background">
      <RouteProgress />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/40 bg-sidebar/50 backdrop-blur-xl">
        <div className="p-4 border-b border-border/40">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList />
        </div>
        <div className="p-3 border-t border-border/40">
          <SidebarFooter />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <MobileNav />
        <Logo />
        <div className="flex items-center gap-1">
          <GlobalSearch variant="icon" />
          <NotificationBell />
        </div>
      </div>

      {/* Main content */}
      <main id="main-content" className="flex-1 min-w-0 overflow-x-hidden">
        {/* Desktop top strip — sticky, holds search + notification bell */}
        <div className="hidden lg:flex sticky top-0 z-30 h-12 items-center justify-end px-4 gap-2 border-b border-border/40 bg-background/70 backdrop-blur-xl">
          <GlobalSearch variant="icon" />
          <NotificationBell />
        </div>
        <div className="pt-16 lg:pt-0 pb-16 lg:pb-0">
          <ViewEnter>
            {children}
          </ViewEnter>
        </div>
      </main>

      {/* Role-aware bottom navigation (mobile, logged in) */}
      <MobileTabBar />
    </div>
  )
}
