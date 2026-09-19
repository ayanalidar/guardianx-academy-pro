/**
 * Path-based URL router for GuardianX Academy.
 *
 * NOTE: deliberately NOT "use client" — this module contains pure mapping
 * functions that are ALSO called from server components (the catch-all
 * bridge `src/app/[...gx]/page.tsx` and `batches/[slug]` use pathToView /
 * viewTitle / viewDescription for SSR + metadata). A "use client" directive
 * here makes those server-side calls throw
 * ("Attempted to call pathToView() from the server…"), which crashed every
 * route without a dedicated page (/login, /course/<id>, /dashboard, …).
 * Only URL-mutating helpers (pushViewToUrl / replaceViewInUrl /
 * readViewFromUrl) touch browser APIs, and those are only ever invoked from
 * client code (the Zustand store).
 *
 * Previously every view lived in the URL hash (`/#/skill-assessments`),
 * which broke SEO (hash fragments never reach the server), deep links,
 * open-in-new-tab and analytics. This module now maps every Zustand
 * `View` to a REAL path (`/skill-assessments`) and back:
 *
 *   viewToPath(view)   — View → canonical URL path (used by navigate())
 *   pathToView(path)   — URL path → View (used on load, popstate, bridge page)
 *   hashToView(hash)   — LEGACY `#/...` → View (one-time redirect on load)
 *
 * Views that have dedicated Next.js pages (e.g. /courses, /blog/<slug>)
 * map to those real routes; everything else is served by the catch-all
 * bridge page `src/app/[...gx]/page.tsx` which hydrates the SPA store —
 * so every view gets a real, shareable, crawlable URL with zero view
 * rewrites.
 */

import type { View } from "@/store/app-store"

/* ----------------------------- view → path ------------------------------ */

/** Convert a View object into its canonical URL path. */
export function viewToPath(view: View): string {
  switch (view.name) {
    case "home":
      return "/"
    case "course":
      return `/course/${encodeURIComponent(view.courseId)}`
    case "lesson":
      return `/course/${encodeURIComponent(view.courseId)}/lesson/${encodeURIComponent(view.lessonId)}`
    case "lab":
      return `/lab/${encodeURIComponent(view.labSlug)}`
    case "exam-detail":
      return `/exams/${encodeURIComponent(view.examId)}`
    case "verify":
      return view.credentialId
        ? `/verify/${encodeURIComponent(view.credentialId)}`
        : "/verify"
    case "instructor-detail":
      return `/instructors/${encodeURIComponent(view.instructorId)}`
    case "event-detail":
      return `/events/${encodeURIComponent(view.eventSlug)}`
    case "blog-post":
      return `/blog/${encodeURIComponent(view.slug)}`
    case "cert-landing":
      return `/cert/${encodeURIComponent(view.certSlug)}`
    case "batch-detail":
      return `/batches/${encodeURIComponent(view.batchSlug)}`
    case "cyber-quiz-runner":
      return `/cyber-quiz/start/${encodeURIComponent(view.difficulty)}`
    case "cyber-quiz-results":
      return `/cyber-quiz/results/${encodeURIComponent(view.attemptId)}`
    case "cyber-quiz-certificate":
      return `/cyber-quiz/certificate/${encodeURIComponent(view.credentialId)}`
    case "cyber-quiz-progress":
      return `/cyber-quiz/progress/${encodeURIComponent(view.credentialId)}`
    case "legal":
      return `/${view.pageType}`
    // Role dashboards get explicit names so they never collide with the
    // public "/instructors" listing or the "/admin-…" config pages.
    case "instructor":
      return "/instructor-dashboard"
    case "school":
      return "/school-dashboard"
    case "admin":
      return "/admin-dashboard"
    // Views with dedicated real Next.js pages:
    case "catalog":
      return "/courses"
    case "institutions":
      return "/institutions"
    case "institutions-schools":
      return "/institutions/schools"
    case "institutions-colleges":
      return "/institutions/colleges"
    case "institutions-universities":
      return "/institutions/universities"
    case "institutions-open-schooling":
      return "/institutions/open-schooling"
    // Everything else: 1:1 name → path (served by the catch-all bridge).
    default:
      return `/${view.name}`
  }
}

/* ----------------------------- path → view ------------------------------ */

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const LEGAL_PAGES = ["about", "privacy", "terms", "faq", "refund", "cookies", "conduct"]

/** Every view name that maps 1:1 to `/<name>` (the bridge-space routes). */
const KNOWN_FLAT_VIEWS = new Set<View["name"]>([
  "impact", "dashboard", "learning", "notes", "live", "labs", "certificates",
  "achievements", "leaderboard", "community", "profile", "assignments",
  "messaging", "study-groups", "office-hours", "book-session", "auth",
  "ai-assistant", "threat-feed", "code-review", "career-planner", "job-board",
  "mock-interview", "resume-builder", "ctf-platform", "weekly-challenges",
  "team-missions", "learning-analytics", "skill-assessments",
  "prerequisites-visualizer", "lab-snapshots", "skill-tree", "bug-bounty",
  "parent-portal", "course-studio", "cms", "exams", "credentials",
  "invoice-generator", "proposal-maker", "support", "instructors", "events",
  "blog", "affiliate", "pricing", "batches", "contact", "learning-paths",
  "admin-lead-crm", "admin-batch-calendar", "admin-student-progress",
  "admin-revenue", "admin-cert-bulk", "admin-email-campaign",
  "admin-instructor-assignment", "admin-audit-log", "admin-platform-health",
  "admin-notifications", "admin-coupons", "admin-open-schooling-leads",
  "admin-corporate-leads", "admin-cyber-quiz-questions",
  "admin-cyber-quiz-attempts", "admin-cyber-quiz-certs",
  "admin-platform-stats", "admin-settings", "admin-courses", "admin-seo",
  "cyber-quiz", "corporate-training", "verify", "login",
])

/**
 * Convert a URL path (pathname [+ search]) into a View.
 * Returns `null` for unrecognized paths so callers can render a 404.
 * Accepts canonical paths AND legacy variants (e.g. /exam/<id>, /event/<slug>).
 */
export function pathToView(pathWithSearch: string): View | null {
  if (typeof pathWithSearch !== "string") return null
  const [rawPath, rawSearch = ""] = pathWithSearch.split("?")
  const path = rawPath.replace(/\/+$/, "") || "/"
  const parts = path.split("/").filter(Boolean).map(safeDecode)
  const search = new URLSearchParams(rawSearch)

  if (parts.length === 0) return { name: "home" }

  // /course/<id>  and  /course/<id>/lesson/<lid>
  if (parts[0] === "course" && parts[1]) {
    if (parts[2] === "lesson" && parts[3]) {
      return { name: "lesson", courseId: parts[1], lessonId: parts[3] }
    }
    return { name: "course", courseId: parts[1] }
  }
  // /lab/<slug>
  if (parts[0] === "lab" && parts[1]) return { name: "lab", labSlug: parts[1] }
  // /exams/<id> (canonical) or /exam/<id> (legacy)
  if ((parts[0] === "exams" || parts[0] === "exam") && parts[1]) {
    return { name: "exam-detail", examId: parts[1] }
  }
  // /verify, /verify/<id>, /verify?credentialId=<id>
  if (parts[0] === "verify") {
    const credentialId = parts[1] ?? search.get("credentialId") ?? undefined
    return { name: "verify", credentialId }
  }
  // /instructors/<id>  (listing handled by flat views below)
  if (parts[0] === "instructors" && parts[1]) {
    return { name: "instructor-detail", instructorId: parts[1] }
  }
  // Role-dashboard canonical paths (view names stay "instructor"/"school"/
  // "admin"; the -dashboard suffix avoids colliding with public listings).
  if (parts[0] === "instructor-dashboard" && !parts[1]) return { name: "instructor" }
  if (parts[0] === "school-dashboard" && !parts[1]) return { name: "school" }
  if (parts[0] === "admin-dashboard" && !parts[1]) return { name: "admin" }
  // /instructor/<id> (legacy detail) — "/instructor" alone → dashboard
  if (parts[0] === "instructor") {
    if (parts[1]) return { name: "instructor-detail", instructorId: parts[1] }
    return { name: "instructor" }
  }
  if (parts[0] === "school" && !parts[1]) return { name: "school" }
  if (parts[0] === "admin" && !parts[1]) return { name: "admin" }
  // /batches/<slug> (batch detail — real page + SPA view)
  if (parts[0] === "batches" && parts[1]) {
    return { name: "batch-detail", batchSlug: parts[1] }
  }
  // /events/<slug> (canonical) or /event/<slug> (legacy)
  if (parts[0] === "events" && parts[1]) return { name: "event-detail", eventSlug: parts[1] }
  if (parts[0] === "event" && parts[1]) return { name: "event-detail", eventSlug: parts[1] }
  // /blog/<slug>
  if (parts[0] === "blog" && parts[1]) return { name: "blog-post", slug: parts[1] }
  // /cert/<slug>
  if (parts[0] === "cert" && parts[1]) return { name: "cert-landing", certSlug: parts[1] }
  // /catalog (legacy listing) → catalog view (viewToPath canonicalizes to /courses)
  if (parts[0] === "catalog" && !parts[1]) return { name: "catalog" }
  // /partners (legacy) → institutions
  if (parts[0] === "partners" && !parts[1]) return { name: "institutions" }
  // Legacy "my learning" URL variants people type by hand — the canonical
  // path is /learning, but these must resolve (not 404) for robustness.
  if (parts.length === 1 && (parts[0] === "my-learning" || parts[0] === "my-courses")) {
    return { name: "learning" }
  }

  // Cyber quiz sub-routes:
  if (parts[0] === "cyber-quiz") {
    if (parts[1] === "start" && parts[2]) {
      const diff = parts[2] as "Easy" | "Hard" | "Advanced"
      if (["Easy", "Hard", "Advanced"].includes(diff)) {
        return { name: "cyber-quiz-runner", difficulty: diff }
      }
    }
    if (parts[1] === "results" && parts[2]) {
      return { name: "cyber-quiz-results", attemptId: parts[2] }
    }
    if (parts[1] === "certificate" && parts[2]) {
      return { name: "cyber-quiz-certificate", credentialId: parts[2] }
    }
    if (parts[1] === "progress" && parts[2]) {
      return { name: "cyber-quiz-progress", credentialId: parts[2] }
    }
    return { name: "cyber-quiz" }
  }

  // Legal / info pages: /about /privacy /terms /faq /refund /cookies /conduct
  if (parts.length === 1 && (LEGAL_PAGES.includes(parts[0]) as boolean)) {
    return { name: "legal", pageType: parts[0] as any }
  }

  // Institutions section (real pages exist):
  if (parts[0] === "institutions" && parts[1]) {
    switch (parts[1]) {
      case "schools": return { name: "institutions-schools" }
      case "colleges": return { name: "institutions-colleges" }
      case "universities": return { name: "institutions-universities" }
      case "open-schooling": return { name: "institutions-open-schooling" }
    }
  }

  // /<view-name> flat routes (validated so unknown paths 404 instead of
  // silently rendering the homepage).
  if (parts.length === 1 && KNOWN_FLAT_VIEWS.has(parts[0] as View["name"])) {
    return { name: parts[0] as View["name"] } as View
  }

  return null
}

/* --------------------------- legacy hash support ------------------------- */

/** LEGACY ONLY: old `#/...` hash → View. Kept so existing shared links
 *  (`/#/skill-assessments`) redirect to the clean path on first load. */
export function hashToView(hash: string): View {
  const raw = hash.replace(/^#/, "")
  if (!raw || raw === "/") return { name: "home" }
  // Delegate to the path parser — the hash body used the same grammar
  // (e.g. "#/course/<id>", "#/verify?credentialId=x").
  const parsed = pathToView(raw)
  return parsed ?? { name: "home" }
}

/* ------------------------------ URL side-effects ------------------------- */

/** Push a view into the address bar as a REAL path (history.pushState),
 *  without triggering Next.js navigation — the SPA store drives rendering. */
export function pushViewToUrl(view: View) {
  if (typeof window === "undefined") return
  const url = viewToPath(view)
  if (window.location.pathname + window.location.search !== url) {
    window.history.pushState({ view }, "", url)
  }
}

/** Replace the current URL with the view's path (no history entry). */
export function replaceViewInUrl(view: View) {
  if (typeof window === "undefined") return
  const url = viewToPath(view)
  if (window.location.pathname + window.location.search !== url) {
    window.history.replaceState({ view }, "", url)
  }
}

/** Read the current view from the URL (pathname; falls back to a legacy
 *  hash if one is present). SSR-safe (returns home). */
export function readViewFromUrl(): View {
  if (typeof window === "undefined") return { name: "home" }
  if (window.location.hash && window.location.hash !== "#") {
    return hashToView(window.location.hash)
  }
  const path = window.location.pathname + window.location.search
  return pathToView(path) ?? { name: "home" }
}

/* ------------------------------- public views ---------------------------- */

/** Views renderable without a session (header/footer shell). */
export const PUBLIC_VIEWS = new Set<View["name"]>([
  "home", "impact", "contact", "institutions", "institutions-schools",
  "institutions-colleges", "institutions-universities",
  "institutions-open-schooling",
  "corporate-training",
  "cyber-quiz", "cyber-quiz-runner", "cyber-quiz-results",
  "cyber-quiz-certificate", "cyber-quiz-progress",
  "catalog", "batches", "batch-detail", "course", "cyber-range", "learning-paths", "skill-tree",
  "exams", "credentials", "support", "verify",
  "instructors", "instructor-detail", "events", "event-detail",
  "blog", "blog-post",
  "cert-landing",
  "pricing",
  "legal",
])

/** Human-readable titles for bridge-route metadata (SEO). */
const VIEW_TITLES: Partial<Record<View["name"], string>> = {
  home: "Cybersecurity Training & Certifications",
  impact: "Our Impact",
  login: "Log In",
  dashboard: "Student Dashboard",
  catalog: "Cybersecurity Courses & Certifications",
  batches: "Training Batches",
  "batch-detail": "Training Batch Details",
  exams: "Exam Platform",
  credentials: "My Credentials",
  verify: "Verify a Credential",
  support: "Support",
  instructors: "Meet Our Instructors",
  events: "Events & Workshops",
  blog: "Security Blog",
  pricing: "Pricing & Subscription Plans",
  contact: "Contact Us",
  certificates: "My Certificates",
  achievements: "Achievements",
  leaderboard: "Leaderboard",
  community: "Community",
  profile: "My Profile",
  assignments: "Assignments",
  messaging: "Messages",
  "study-groups": "Study Groups",
  "office-hours": "Office Hours",
  "book-session": "Book a 1:1 Session",
  "ai-assistant": "AI Security Assistant",
  "threat-feed": "Live Threat Feed",
  "code-review": "AI Code Review",
  "career-planner": "Career Planner",
  "job-board": "Cybersecurity Job Board",
  "mock-interview": "Mock Interview",
  "resume-builder": "Resume Builder",
  "ctf-platform": "CTF Platform",
  "weekly-challenges": "Weekly Challenges",
  "team-missions": "Team Missions",
  "learning-analytics": "Learning Analytics",
  "skill-assessments": "Skill Assessments",
  "prerequisites-visualizer": "Course Prerequisites",
  "lab-snapshots": "Lab Snapshots",
  "cyber-range": "Cyber Range",
  "learning-paths": "Learning Paths",
  "skill-tree": "Skill Tree",
  "bug-bounty": "Bug Bounty",
  "parent-portal": "Parent Portal",
  "course-studio": "Course Studio",
  cms: "CMS Dashboard",
  affiliate: "Affiliate Program",
  "corporate-training": "Corporate Training",
  "instructor": "Instructor Dashboard",
  "school": "School Dashboard",
  "admin": "Admin Dashboard",
}

/** Metadata title for a view (used by the catch-all's generateMetadata). */
export function viewTitle(view: View): string {
  if (view.name === "legal") {
    return `${view.pageType.charAt(0).toUpperCase()}${view.pageType.slice(1)} | GuardianX Academy`
  }
  if (view.name === "course") return "Course Details | GuardianX Academy"
  if (view.name === "lab") return "Hands-on Lab | GuardianX Academy"
  if (view.name === "exam-detail") return "Exam Details | GuardianX Academy"
  if (view.name === "lesson") return "Lesson | GuardianX Academy"
  if (view.name === "blog-post") return "Blog | GuardianX Academy"
  if (view.name === "event-detail") return "Event | GuardianX Academy"
  if (view.name === "instructor-detail") return "Instructor Profile | GuardianX Academy"
  if (view.name === "cert-landing") return "Certification | GuardianX Academy"
  if (view.name === "cyber-quiz-runner") return "Cyber Quiz | GuardianX Academy"
  if (view.name === "cyber-quiz-results") return "Quiz Results | GuardianX Academy"
  if (view.name === "cyber-quiz-certificate") return "Your Certificate | GuardianX Academy"
  if (view.name === "cyber-quiz-progress") return "Quiz Progress | GuardianX Academy"
  const t = VIEW_TITLES[view.name]
  return t ? `${t} | GuardianX Academy` : "GuardianX Academy"
}

/** Metadata description fallback for bridge routes. */
export function viewDescription(view: View): string {
  const t = VIEW_TITLES[view.name]
  return t
    ? `${t} — GuardianX Academy, hands-on cybersecurity training with live instructors, real labs and industry certifications.`
    : "GuardianX Academy — hands-on cybersecurity training with live instructors, real labs and industry certifications."
}
