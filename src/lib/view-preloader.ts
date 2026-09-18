"use client"

/**
 * ViewPreloader — makes SPA navigation feel instant.
 *
 * Every ViewRouter view is a lazy `next/dynamic` chunk. Without warming,
 * the FIRST tap on a view pays a network roundtrip for its JS chunk
 * (on serverless CDNs that can be 300ms–2s) — this is why navigation
 * used to feel slow.
 *
 * Two complementary strategies eliminate the wait:
 *
 *   1. IDLE PRELOAD — after the shell mounts, download every view chunk
 *      during browser idle time: the priority list first (the views a
 *      student/admin actually taps in the first minutes), then the rest,
 *      one chunk per idle callback so we never compete with interaction.
 *
 *   2. INTENT PREFETCH — hovering (desktop) or touching (mobile) any
 *      internal link preloads that view's chunk immediately, giving the
 *      click a ~100-500ms head start even before the idle chain reaches it.
 *
 * The registry below is the SINGLE SOURCE OF TRUTH for view chunk
 * imports: view-router.tsx builds its dynamic() components from the
 * same importers, so webpack emits exactly one chunk per view and the
 * preloader warms precisely the chunks the router will consume.
 */

type ViewImporter = () => Promise<any>

/** view chunk importers, keyed by the file basename under src/views/ */
export const VIEW_IMPORTERS: Record<string, ViewImporter> = {
  "impact": () => import("@/views/impact"),
  "contact": () => import("@/views/contact"),
  "institutions-schools": () => import("@/views/institutions-schools"),
  "institutions-colleges": () => import("@/views/institutions-colleges"),
  "institutions-universities": () => import("@/views/institutions-universities"),
  "open-schooling": () => import("@/views/open-schooling"),
  "corporate-training": () => import("@/views/corporate-training"),
  "cyber-quiz-landing": () => import("@/views/cyber-quiz-landing"),
  "cyber-quiz-runner": () => import("@/views/cyber-quiz-runner"),
  "cyber-quiz-results": () => import("@/views/cyber-quiz-results"),
  "cyber-quiz-certificate": () => import("@/views/cyber-quiz-certificate"),
  "cyber-quiz-progress": () => import("@/views/cyber-quiz-progress"),
  "dashboard": () => import("@/views/dashboard"),
  "course-catalog": () => import("@/views/course-catalog"),
  "batches": () => import("@/views/batches"),
  "batch-detail": () => import("@/views/batch-detail"),
  "exams": () => import("@/views/exams"),
  "credentials": () => import("@/views/credentials"),
  "verify": () => import("@/views/verify"),
  "legal": () => import("@/views/legal"),
  "invoice-generator": () => import("@/views/invoice-generator"),
  "proposal-maker": () => import("@/views/proposal-maker"),
  "admin-lead-crm": () => import("@/views/admin-lead-crm"),
  "admin-batch-calendar": () => import("@/views/admin-batch-calendar"),
  "admin-student-progress": () => import("@/views/admin-student-progress"),
  "admin-revenue": () => import("@/views/admin-revenue"),
  "admin-cert-bulk": () => import("@/views/admin-cert-bulk"),
  "admin-email-campaign": () => import("@/views/admin-email-campaign"),
  "admin-instructor-assignment": () => import("@/views/admin-instructor-assignment"),
  "admin-audit-log": () => import("@/views/admin-audit-log"),
  "admin-platform-health": () => import("@/views/admin-platform-health"),
  "admin-notifications": () => import("@/views/admin-notifications"),
  "admin-coupons": () => import("@/views/admin-coupons"),
  "support": () => import("@/views/support"),
  "instructors": () => import("@/views/instructors"),
  "instructor-detail": () => import("@/views/instructor-detail"),
  "events": () => import("@/views/events"),
  "event-detail": () => import("@/views/event-detail"),
  "blog": () => import("@/views/blog"),
  "blog-post": () => import("@/views/blog-post"),
  "cert-landing": () => import("@/views/cert-landing"),
  "admin-courses": () => import("@/views/admin-courses"),
  "affiliate": () => import("@/views/affiliate"),
  "pricing": () => import("@/views/pricing"),
  "admin-seo": () => import("@/views/admin-seo"),
  "admin-open-schooling-leads": () => import("@/views/admin-open-schooling-leads"),
  "admin-corporate-leads": () => import("@/views/admin-corporate-leads"),
  "admin-cyber-quiz-questions": () => import("@/views/admin-cyber-quiz-questions"),
  "admin-cyber-quiz-attempts": () => import("@/views/admin-cyber-quiz-attempts"),
  "admin-cyber-quiz-certs": () => import("@/views/admin-cyber-quiz-certs"),
  "admin-platform-stats": () => import("@/views/admin-platform-stats"),
  "admin-settings": () => import("@/views/admin-settings"),
  "course-detail": () => import("@/views/course-detail"),
  "lesson-view": () => import("@/views/lesson-view"),
  "my-learning": () => import("@/views/my-learning"),
  "my-notes": () => import("@/views/my-notes"),
  "live-sessions": () => import("@/views/live-sessions"),
  "labs": () => import("@/views/labs"),
  "lab-detail": () => import("@/views/lab-detail"),
  "certificates": () => import("@/views/certificates"),
  "achievements": () => import("@/views/achievements"),
  "leaderboard": () => import("@/views/leaderboard"),
  "instructor-dashboard": () => import("@/views/instructor-dashboard"),
  "school-dashboard": () => import("@/views/school-dashboard"),
  "admin-dashboard": () => import("@/views/admin-dashboard"),
  "community": () => import("@/views/community"),
  "profile": () => import("@/views/profile"),
  "assignments": () => import("@/views/assignments"),
  "messaging": () => import("@/views/messaging"),
  "study-groups": () => import("@/views/study-groups"),
  "office-hours": () => import("@/views/office-hours"),
  "book-session": () => import("@/views/book-session"),
  "ai-assistant": () => import("@/views/ai-assistant"),
  "threat-feed": () => import("@/views/threat-feed"),
  "code-review": () => import("@/views/code-review"),
  "career-planner": () => import("@/views/career-planner"),
  "job-board": () => import("@/views/job-board"),
  "parent-portal": () => import("@/views/parent-portal"),
  "cms-dashboard": () => import("@/views/cms-dashboard"),
  "mock-interview": () => import("@/views/mock-interview"),
  "resume-builder": () => import("@/views/resume-builder"),
  "ctf-platform": () => import("@/views/ctf-platform"),
  "weekly-challenges": () => import("@/views/weekly-challenges"),
  "team-missions": () => import("@/views/team-missions"),
  "learning-analytics": () => import("@/views/learning-analytics"),
  "skill-assessments": () => import("@/views/skill-assessments"),
  "prerequisites-visualizer": () => import("@/views/prerequisites-visualizer"),
  "lab-snapshots": () => import("@/views/lab-snapshots"),
  "bug-bounty": () => import("@/views/bug-bounty"),
  "course-studio": () => import("@/views/course-studio"),
  "exam-detail": () => import("@/views/exam-detail"),
  "skill-tree": () => import("@/views/skill-tree"),
  "cyber-range": () => import("@/views/cyber-range"),
  "learning-paths": () => import("@/views/learning-paths"),
}

/** store view name → chunk file (only where the two differ) */
const VIEW_NAME_TO_FILE: Record<string, string> = {
  "institutions": "institutions-schools",
  "institutions-open-schooling": "open-schooling",
  "cyber-quiz": "cyber-quiz-landing",
  "catalog": "course-catalog",
  "course": "course-detail",
  "lesson": "lesson-view",
  "learning": "my-learning",
  "notes": "my-notes",
  "live": "live-sessions",
  "lab": "lab-detail",
  "instructor": "instructor-dashboard",
  "school": "school-dashboard",
  "admin": "admin-dashboard",
  "cms": "cms-dashboard",
}

/** Preload the chunk backing a store view name. Safe to call repeatedly —
 *  webpack memoizes the import and we dedupe in-flight calls too. */
export function preloadView(viewName: string): void {
  const file = VIEW_NAME_TO_FILE[viewName] ?? viewName
  const importer = VIEW_IMPORTERS[file]
  if (importer) importer().catch(() => {})
}

/* --------------------------------------------------------------- */

const inFlight = new Set<string>()
let idleStarted = false

/** Views users tap first after landing (students + admins). */
const PRIORITY_VIEWS = [
  "catalog", "course", "dashboard", "batches", "batch-detail",
  "learning", "labs", "live", "exams", "certificates", "achievements",
  "leaderboard", "profile", "instructors", "events", "blog", "pricing",
  "verify", "support", "skill-assessments", "learning-paths", "community",
  "assignments", "notes", "cert-landing", "cyber-quiz", "instructor", "admin",
]

function scheduleIdle(fn: () => void): void {
  if (typeof window === "undefined") return
  if ("requestIdleCallback" in window) {
    ;(window as any).requestIdleCallback(fn, { timeout: 1200 })
  } else {
    setTimeout(fn, 350)
  }
}

/** Progressively warm every view chunk during idle time, priority first.
 *  Runs at most once per page session. */
export function startIdlePreload(): void {
  if (idleStarted || typeof window === "undefined") return
  idleStarted = true

  const queue: string[] = []
  const seen = new Set<string>()
  const push = (name: string) => {
    const file = VIEW_NAME_TO_FILE[name] ?? name
    if (VIEW_IMPORTERS[file] && !seen.has(file)) { seen.add(file); queue.push(file) }
  }
  PRIORITY_VIEWS.forEach(push)
  Object.keys(VIEW_IMPORTERS).forEach(push)

  let i = 0
  const step = () => {
    // stop eagerly if the user is on metered/hidden context — resume never
    if (i >= queue.length) return
    const importer = VIEW_IMPORTERS[queue[i++]]
    Promise.resolve()
      .then(importer)
      .catch(() => {})
      .finally(() => scheduleIdle(step))
  }
  scheduleIdle(step)
}

/** Hover / touch-intent prefetch: any internal <a> that maps to an SPA
 *  view preloads that view's chunk before the click even happens. */
export function attachIntentPrefetch(): () => void {
  if (typeof window === "undefined") return () => {}
  let lastHref = ""

  const onIntent = (e: Event) => {
    const target = e.target as HTMLElement | null
    const anchor = target?.closest?.("a[href^='/']") as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute("href") || ""
    if (href === lastHref) return
    if (anchor.target === "_blank" || anchor.hasAttribute("download")) return
    lastHref = href
    try {
      // dynamic import of the isomorphic parser (no side effects)
      import("@/lib/url-router").then(({ pathToView }) => {
        const view = pathToView(href)
        if (view) preloadView(view.name)
      }).catch(() => {})
    } catch {}
  }

  const opts: AddEventListenerOptions = { passive: true, capture: true }
  document.addEventListener("pointerover", onIntent, opts)
  document.addEventListener("touchstart", onIntent, opts)
  return () => {
    document.removeEventListener("pointerover", onIntent, opts)
    document.removeEventListener("touchstart", onIntent, opts)
  }
}
