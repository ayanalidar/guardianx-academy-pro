"use client"

import * as React from "react"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import {
  FlaskConical, BookOpen, Route, Trophy, Briefcase, Search, Target,
  Brain,
  FileText, School, Building, Landmark, ShieldCheck, Award, GraduationCap,
  ExternalLink,
  TrendingUp, Mail, Menu, ChevronDown, LogIn, LayoutDashboard,
  CalendarCheck, Terminal, Shield, FileBadge, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useAppStore, type View } from "@/store/app-store"
import { viewToPath } from "@/lib/url-router"
import { AnimatedLogoMark } from "@/components/platform/animated-logo"
import { GlobalSearch } from "@/components/platform/global-search"
import { usePageContent, getContent } from "@/lib/use-content"

/* ============================================================
   PublicHeader - floating mega-menu navigation
   ------------------------------------------------------------
   - Transparent → glass surface → compact on scroll
   - Hides on scroll-down past 300px, shows on scroll-up
   - Desktop (lg+): top-level group buttons reveal a shared
     glass-strong mega panel with 2-column item grid
   - Mobile: Sheet + Accordion with the same items vertically
   - Logo (left) → Mega menu (center) → Login/Hamburger (right)
   ============================================================ */

type IconType = React.ComponentType<{ className?: string }>

interface MegaMenuItem {
  icon: IconType
  title: string
  description: string
  view: View
  // When true, clicking opens the page in a new browser tab (target=_blank)
  // instead of navigating the current tab. Used for items that are
  // conceptually separate landing pages (e.g. Open Schooling).
  external?: boolean
}

interface MegaMenuGroup {
  id: string
  label: string
  items: MegaMenuItem[]
}

const MEGA_MENU_GROUPS: MegaMenuGroup[] = [
  {
    id: "learn",
    label: "Learn",
    items: [
      {
        icon: BookOpen,
        title: "Courses",
        description: "Certification courses - CEH to CISSP",
        view: { name: "catalog" },
      },
      {
        icon: CalendarCheck,
        title: "Upcoming Batches",
        description: "Live instructor-led certification batches",
        view: { name: "batches" },
      },
      {
        icon: Route,
        title: "Learning Paths",
        description: "Curated tracks from beginner to job-ready",
        view: { name: "learning-paths" },
      },
      {
        icon: Shield,
        title: "Skill Tree",
        description: "Map your cybersecurity skills",
        view: { name: "skill-tree" },
      },
      {
        icon: ShieldCheck,
        title: "Proctored Exams",
        description: "Identity-verified certification exams",
        view: { name: "exams" },
      },
    ],
  },
  {
    id: "practice",
    label: "Practice",
    items: [
      {
        icon: FlaskConical,
        title: "Cyber Range",
        description: "Live virtual targets & hands-on hacking",
        view: { name: "cyber-range" },
      },
      {
        icon: Terminal,
        title: "Labs",
        description: "31 Docker-powered practice labs",
        view: { name: "labs" },
      },
      {
        icon: Trophy,
        title: "CTF Arena",
        description: "Compete in capture-the-flag challenges",
        view: { name: "ctf-platform" },
      },
      {
        icon: Target,
        title: "Weekly Challenges",
        description: "New security challenges every week",
        view: { name: "weekly-challenges" },
      },
      {
        icon: Brain,
        title: "Cyber Awareness Quiz",
        description: "Free public quiz + ₹199 certificate",
        view: { name: "cyber-quiz" },
      },
    ],
  },
  {
    id: "career",
    label: "Career",
    items: [
      {
        icon: Briefcase,
        title: "Career Paths",
        description: "Plan your path from learner to hire",
        view: { name: "career-planner" },
      },
      {
        icon: Target,
        title: "Skill Assessment",
        description: "Test your skills against real scenarios",
        view: { name: "skill-assessments" },
      },
      {
        icon: Award,
        title: "Certifications",
        description: "Verifiable digital credentials",
        view: { name: "certificates" },
      },
      {
        icon: FileText,
        title: "Resume Builder",
        description: "Generate a security-tailored resume",
        view: { name: "resume-builder" },
      },
      {
        icon: FileBadge,
        title: "GuardianX Certifications",
        description: "Your verifiable proctored credentials",
        view: { name: "credentials" },
      },
      {
        icon: TrendingUp,
        title: "Pricing",
        description: "Plans for learners, teams, and institutions",
        view: { name: "pricing" },
      },
    ],
  },
  {
    id: "institutions",
    label: "Institutions",
    items: [
      {
        icon: School,
        title: "Schools",
        description: "K-12 cyber education with SMS",
        view: { name: "institutions-schools" },
      },
      {
        icon: Building,
        title: "Colleges",
        description: "Certification training & ERP integration",
        view: { name: "institutions-colleges" },
      },
      {
        icon: Landmark,
        title: "Universities",
        description: "Degree programs & research labs",
        view: { name: "institutions-universities" },
      },
      {
        icon: GraduationCap,
        title: "Open Schooling",
        description: "Complete 10th & 12th through open schooling",
        view: { name: "institutions-open-schooling" },
        external: true,
      },
      {
        icon: Briefcase,
        title: "Corporate Training",
        description: "Custom cyber training for teams",
        view: { name: "corporate-training" },
      },
    ],
  },
  {
    id: "about",
    label: "About",
    items: [
      {
        icon: TrendingUp,
        title: "Impact",
        description: "Outcomes, learner stats & milestones",
        view: { name: "impact" },
      },
      {
        icon: Users,
        title: "Instructors",
        description: "Meet the practitioners teaching our courses",
        view: { name: "instructors" },
      },
      {
        icon: CalendarCheck,
        title: "Events",
        description: "Workshops, webinars, CTFs & bootcamps",
        view: { name: "events" },
      },
      {
        icon: FileText,
        title: "Blog",
        description: "Threat analysis, how-tos & certification tips",
        view: { name: "blog" },
      },
      {
        icon: Mail,
        title: "Contact",
        description: "Reach the GuardianX team",
        view: { name: "contact" },
      },
    ],
  },
]

export function PublicHeader() {
  const { navigate, view } = useAppStore()
  const [scrolled, setScrolled] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  // Session awareness: without this, a LOGGED-IN user browsing public
  // "website" pages saw a bare "Login" button and concluded they had been
  // signed out. We fetch the session once and re-check when auth screens
  // signal a change (guardianx-session-changed).
  const [sessionUser, setSessionUser] = React.useState<{ name?: string; role?: string } | null>(null)
  React.useEffect(() => {
    let cancelled = false
    const check = () => {
      fetch("/api/auth/session", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setSessionUser(d?.user ?? null) })
        .catch(() => { if (!cancelled) setSessionUser(null) })
    }
    check()
    window.addEventListener("guardianx-session-changed", check)
    return () => { cancelled = true; window.removeEventListener("guardianx-session-changed", check) }
  }, [])

  const dashboardView: View = sessionUser?.role === "ADMIN"
    ? { name: "admin" }
    : sessionUser?.role === "INSTRUCTOR"
      ? { name: "instructor" }
      : sessionUser?.role === "SCHOOL_ADMIN"
        ? { name: "school" }
        : { name: "dashboard" }
  const { scrollY } = useScroll()
  const lastScroll = React.useRef(0)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // CMS-driven brand (Admin → Content Studio → Global → Header).
  // The CMS header navLinks/tagline keys are superseded by the mega-menu
  // structure — only the brand name/accent are consumed here.
  const globalCms = usePageContent("global")
  const brandName = getContent(globalCms.data, "header", "brandName", "Guardian")
  const brandAccent = getContent(globalCms.data, "header", "brandAccent", "X")

  // Scroll behaviour - preserve from original header
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40)
    if (latest > 300 && latest > lastScroll.current + 10) {
      setHidden(true)
      setOpenMenuId(null)
    } else if (latest < lastScroll.current - 10 || latest < 100) {
      setHidden(false)
    }
    lastScroll.current = latest
  })

  // Cleanup close timer on unmount
  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  // Escape closes any open menu
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null)
        setMobileOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const cancelCloseTimer = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const handleOpenMenu = React.useCallback((id: string) => {
    cancelCloseTimer()
    setOpenMenuId(id)
  }, [cancelCloseTimer])

  const scheduleCloseMenu = React.useCallback(() => {
    cancelCloseTimer()
    closeTimer.current = setTimeout(() => setOpenMenuId(null), 120)
  }, [cancelCloseTimer])

  // Menu item URL — external items (e.g. Open Schooling) point at their
  // dedicated Next.js route opened in a new browser tab; internal items use
  // the canonical SPA path so middle-click / new-tab / SEO all work.
  const menuItemHref = React.useCallback((item: MegaMenuItem): string => {
    if (item.external) {
      const slug = item.view.name.replace(/^institutions-/, "")
      return `/institutions/${slug}`
    }
    return viewToPath(item.view)
  }, [])

  // Anchor onClick for INTERNAL items: SPA navigation (no reload).
  // Modified clicks (Ctrl/Cmd/Shift/Alt) fall through to the browser so
  // "open in new tab" keeps working via the real href.
  const handleLinkClick = React.useCallback(
    (e: React.MouseEvent, v: View) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return
      e.preventDefault()
      navigate(v)
      setOpenMenuId(null)
      setMobileOpen(false)
    },
    [navigate]
  )

  const isViewActive = React.useCallback((v: View) => view.name === v.name, [view.name])

  const openGroup = React.useMemo(
    () => MEGA_MENU_GROUPS.find((g) => g.id === openMenuId) ?? null,
    [openMenuId]
  )

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{
        y: hidden ? -100 : 0,
        opacity: 1,
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4"
    >
      <motion.div
        animate={{
          maxWidth: scrolled ? "64rem" : "80rem",
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative mx-auto flex items-center justify-between transition-all duration-500 px-5 sm:px-6",
          scrolled
            ? "h-14 rounded-2xl border border-border/60 bg-background/70 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]"
            : "h-16 rounded-2xl border border-transparent bg-transparent"
        )}
        onMouseLeave={scheduleCloseMenu}
      >
        {/* ===== Logo (left) ===== */}
        <motion.a
          href="/"
          onClick={(e) => handleLinkClick(e, { name: "home" })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 group shrink-0"
          aria-label="GuardianX - go to home"
        >
          <AnimatedLogoMark size={32} />
          <div className="text-left">
            <div className="font-bold text-sm leading-none tracking-tight">
              {brandName}<span className="text-violet-400">{brandAccent}</span>
            </div>
          </div>
        </motion.a>

        {/* ===== Global search (between logo and nav) — visible on all sizes ===== */}
        <div className="hidden lg:block flex-1 max-w-md mx-4">
          <GlobalSearch />
        </div>

        {/* Mobile search — visible below lg (was desktop-only before) */}
        <div className="lg:hidden flex-1 mx-3 min-w-0">
          <GlobalSearch />
        </div>

        {/* ===== Desktop mega-menu nav (center) ===== */}
        <nav
          className="hidden lg:flex items-center gap-0.5"
          aria-label="Primary"
        >
          {MEGA_MENU_GROUPS.map((group) => {
            const isOpen = openMenuId === group.id
            const anyChildActive = group.items.some((i) => isViewActive(i.view))
            const highlight = isOpen || anyChildActive
            return (
              <div
                key={group.id}
                className="relative"
                onMouseEnter={() => handleOpenMenu(group.id)}
                onMouseLeave={scheduleCloseMenu}
              >
                <button
                  type="button"
                  onClick={() => (isOpen ? setOpenMenuId(null) : handleOpenMenu(group.id))}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={cn(
                    "relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    "flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50",
                    highlight ? "text-violet-300" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="relative z-10 tracking-wide uppercase">{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 relative z-10 transition-transform duration-200",
                      isOpen ? "rotate-180" : ""
                    )}
                    aria-hidden
                  />
                  {highlight && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 rounded-full",
                        isOpen
                          ? "bg-violet-500/15 border border-violet-500/30"
                          : "bg-violet-500/10 border border-violet-500/20"
                      )}
                    />
                  )}
                  {!isOpen && anyChildActive && (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-violet-400"
                    />
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        {/* ===== Right actions ===== */}
        <div className="flex items-center gap-2 shrink-0">
          {sessionUser ? (
            <a
              href={viewToPath(dashboardView)}
              onClick={(e) => handleLinkClick(e, dashboardView)}
              className="hidden sm:inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 hover:bg-violet-500 btn-premium h-8 px-4 text-xs font-medium text-primary-foreground transition-colors"
            >
              <LayoutDashboard className="h-3 w-3 mr-1" />
              <span>Dashboard</span>
            </a>
          ) : (
            <a
              href="/login"
              onClick={(e) => handleLinkClick(e, { name: "login" })}
              className="hidden sm:inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 hover:bg-violet-500 btn-premium h-8 px-4 text-xs font-medium text-primary-foreground transition-colors"
            >
              <LogIn className="h-3 w-3 mr-1" />
              <span>Login</span>
            </a>
          )}

          {/* Mobile hamburger → Sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-96 p-0 flex flex-col">
              <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <AnimatedLogoMark size={28} />
                  <div className="font-bold text-sm leading-none tracking-tight">
                    {brandName}<span className="text-violet-400">{brandAccent}</span>
                  </div>
                </div>
                <SheetTitle className="sr-only">GuardianX navigation menu</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-2 max-h-[70vh]">
                <Accordion type="multiple" className="w-full">
                  {MEGA_MENU_GROUPS.map((group) => (
                    <AccordionItem key={group.id} value={group.id} className="px-3">
                      <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide text-foreground hover:no-underline">
                        {group.label}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-1 pt-1">
                          {group.items.map((item) => {
                            const active = isViewActive(item.view)
                            return (
                              <a
                                key={item.title}
                                href={menuItemHref(item)}
                                onClick={(e) => {
                                  if (!item.external) handleLinkClick(e, item.view)
                                  else { setOpenMenuId(null); setMobileOpen(false) }
                                }}
                                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                className={cn(
                                  "flex items-start gap-3 p-2 rounded-lg text-left transition-colors",
                                  "hover:bg-accent/60",
                                  active && "bg-violet-500/10"
                                )}
                              >
                                <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-300">
                                  <item.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold leading-tight text-foreground flex items-center gap-1.5">
                                    {item.title}
                                    {item.external && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                    {item.description}
                                  </div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="border-t border-border/60 p-4 flex flex-col gap-2">
                {sessionUser ? (
                  <a
                    href={viewToPath(dashboardView)}
                    onClick={(e) => handleLinkClick(e, dashboardView)}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 hover:bg-violet-500 btn-premium text-sm font-medium text-primary-foreground transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </a>
                ) : (
                  <a
                    href="/login"
                    onClick={(e) => handleLinkClick(e, { name: "login" })}
                    className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-violet-600 hover:bg-violet-500 btn-premium text-sm font-medium text-primary-foreground transition-colors"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  © {new Date().getFullYear()} GuardianX Academy
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ===== Shared mega-menu panel (desktop, absolute) ===== */}
        <AnimatePresence>
          {openGroup && (
            <motion.div
              key={`mega-${openGroup.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50",
                "w-[34rem] max-w-[92vw]",
                "glass-strong rounded-xl border border-border/60 shadow-xl p-4"
              )}
              role="menu"
              aria-label={`${openGroup.label} menu`}
              onMouseEnter={cancelCloseTimer}
              onMouseLeave={scheduleCloseMenu}
            >
              {/* group header */}
              <div className="px-2 pb-2 mb-1 border-b border-border/50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300/80">
                  {openGroup.label}
                </div>
              </div>

              <div
                className={cn(
                  "grid gap-1",
                  openGroup.items.length > 2 ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                {openGroup.items.map((item) => {
                  const active = isViewActive(item.view)
                  return (
                    <a
                      key={item.title}
                      href={menuItemHref(item)}
                      role="menuitem"
                      onClick={(e) => {
                        if (!item.external) handleLinkClick(e, item.view)
                        else { setOpenMenuId(null); setMobileOpen(false) }
                      }}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg text-left transition-all group/item",
                        "hover:bg-accent/60",
                        active && "bg-violet-500/10"
                      )}
                    >
                      <div
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
                          "bg-violet-500/10 text-violet-300 transition-colors",
                          "group-hover/item:bg-violet-500/20"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight text-foreground flex items-center gap-1.5">
                          {item.title}
                          {item.external && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {item.description}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.header>
  )
}
