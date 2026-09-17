"use client"

/**
 * URL-hash router for GuardianX Academy SPA.
 *
 * The platform runs on a single Next.js route (`/`) per the sandbox
 * constraint, but every public view must have a real, shareable URL
 * (master-prompt section 7-10). We satisfy both by serializing the
 * Zustand `View` state into the URL hash:
 *
 *   `#/`                              → { name: "home" }
 *   `#/batches`                       → { name: "batches" }
 *   `#/course/<courseId>`             → { name: "course", courseId }
 *   `#/course/<courseId>/lesson/<id>` → { name: "lesson", courseId, lessonId }
 *   `#/lab/<labSlug>`                 → { name: "lab", labSlug }
 *   `#/exam/<examId>`                 → { name: "exam-detail", examId }
 *   `#/verify/<credentialId>`         → { name: "verify", credentialId }
 *   `#/verify?credentialId=<id>`      → { name: "verify", credentialId }
 *   `#/instructors`                   → { name: "instructors" }
 *   `#/instructor/<id>`               → { name: "instructor-detail", instructorId }
 *   `#/events`                         → { name: "events" }
 *   `#/event/<slug>`                   → { name: "event-detail", eventSlug }
 *
 * This gives us: URL changes on nav, refresh works, browser back/forward
 * works, direct URL entry works, "open in new tab" works — all while
 * staying on the single `/` Next.js route.
 */

import type { View } from "@/store/app-store"

/* ----------------------------- serialization ---------------------------- */

/** Convert a View object into a URL hash string (without leading "#"). */
export function viewToHash(view: View): string {
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
      return `/exam/${encodeURIComponent(view.examId)}`
    case "verify":
      return view.credentialId
        ? `/verify/${encodeURIComponent(view.credentialId)}`
        : "/verify"
    case "instructor-detail":
      return `/instructor/${encodeURIComponent(view.instructorId)}`
    case "event-detail":
      return `/event/${encodeURIComponent(view.eventSlug)}`
    case "blog-post":
      return `/blog/${encodeURIComponent(view.slug)}`
    case "cert-landing":
      return `/cert/${encodeURIComponent(view.certSlug)}`
    case "cyber-quiz-runner":
      return `/cyber-quiz/start/${encodeURIComponent(view.difficulty)}`
    case "cyber-quiz-results":
      return `/cyber-quiz/results/${encodeURIComponent(view.attemptId)}`
    case "cyber-quiz-certificate":
      return `/cyber-quiz/certificate/${encodeURIComponent(view.credentialId)}`
    case "cyber-quiz-progress":
      return `/cyber-quiz/progress/${encodeURIComponent(view.credentialId)}`
    default:
      return `/${view.name}`
  }
}

/** Convert a URL hash (with or without leading "#") into a View object.
 *  Returns { name: "home" } for unrecognized / empty hashes. */
export function hashToView(hash: string): View {
  const raw = hash.replace(/^#/, "")
  // Treat empty / "#" / "#/" as home
  if (!raw || raw === "/" || raw === "") return { name: "home" }

  // Strip leading slash for parsing
  const path = raw.startsWith("/") ? raw.slice(1) : raw
  // Wrap decodeURIComponent in try/catch — a malformed % sequence (e.g.
  // "#/course/%ZZ") would otherwise throw an uncaught URIError and break
  // the SPA. Fall back to the raw segment if decoding fails.
  const safeDecode = (s: string): string => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const parts = path.split("/").map(safeDecode)

  // /course/<id>
  if (parts[0] === "course" && parts[1]) {
    if (parts[2] === "lesson" && parts[3]) {
      return { name: "lesson", courseId: parts[1], lessonId: parts[3] }
    }
    return { name: "course", courseId: parts[1] }
  }
  // /lab/<slug>
  if (parts[0] === "lab" && parts[1]) {
    return { name: "lab", labSlug: parts[1] }
  }
  // /exam/<id>
  if (parts[0] === "exam" && parts[1]) {
    return { name: "exam-detail", examId: parts[1] }
  }
  // /verify/<id>  OR  /verify?credentialId=<id>  OR  /verify
  // Note: when the URL is `#/verify?credentialId=...` (no path slash),
  // split("/") yields a single segment "verify?credentialId=..." — so
  // we match against both "verify" and the "verify?..." prefix.
  if (parts[0] === "verify" || parts[0].startsWith("verify?")) {
    // Format A: /verify/<credentialId>
    if (parts[1]) {
      return { name: "verify", credentialId: parts[1] }
    }
    // Format B: /verify?credentialId=<id>  — `parts[0]` still contains
    // the raw "verify?credentialId=..." because split("/") didn't
    // separate it. Parse the query string off the first segment.
    const qIdx = parts[0].indexOf("?")
    if (qIdx !== -1) {
      const query = new URLSearchParams(parts[0].slice(qIdx + 1))
      const id = query.get("credentialId") ?? undefined
      return { name: "verify", credentialId: id }
    }
    // Format C: /verify (no id)
    return { name: "verify" }
  }

  // /instructor/<id>
  if (parts[0] === "instructor" && parts[1]) {
    return { name: "instructor-detail", instructorId: parts[1] }
  }
  // /event/<slug>
  if (parts[0] === "event" && parts[1]) {
    return { name: "event-detail", eventSlug: parts[1] }
  }
  // /blog/<slug>  → single blog post view
  if (parts[0] === "blog" && parts[1]) {
    return { name: "blog-post", slug: parts[1] }
  }
  // /cert/<slug>  → certification landing page (SEO)
  if (parts[0] === "cert" && parts[1]) {
    return { name: "cert-landing", certSlug: parts[1] }
  }

  // Cyber quiz sub-routes:
  // /cyber-quiz/start/<difficulty>     → runner
  // /cyber-quiz/results/<attemptId>    → results
  // /cyber-quiz/certificate/<credId>   → certificate
  // /cyber-quiz/progress/<credId>      → progress report
  // /cyber-quiz                       → landing
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

  // /<view-name> — validate against the known set so we never produce
  // an unknown view from a user-typed URL.
  const knownViews: View["name"][] = [
    "home", "impact", "contact", "login", "institutions",
    "institutions-schools", "institutions-colleges", "institutions-universities",
    "institutions-open-schooling",
    "corporate-training",
    "cyber-quiz",
    "dashboard", "catalog", "batches", "learning", "notes", "live",
    "labs", "certificates", "achievements", "leaderboard", "instructor",
    "school", "admin", "community", "profile", "assignments", "messaging",
    "study-groups", "office-hours", "book-session", "auth", "ai-assistant", "threat-feed",
    "code-review", "career-planner", "job-board", "mock-interview",
    "resume-builder", "ctf-platform", "weekly-challenges", "team-missions",
    "learning-analytics", "skill-assessments", "prerequisites-visualizer",
    "lab-snapshots", "cyber-range", "learning-paths", "skill-tree",
    "bug-bounty", "parent-portal", "course-studio", "cms", "exams",
    "credentials", "invoice-generator", "proposal-maker", "admin-lead-crm",
    "admin-batch-calendar", "admin-student-progress", "admin-revenue",
    "admin-cert-bulk", "admin-email-campaign", "admin-instructor-assignment",
    "admin-audit-log", "admin-platform-health", "admin-notifications",
    "admin-coupons",
    "admin-open-schooling-leads",
    "admin-corporate-leads",
    "admin-cyber-quiz-questions",
    "admin-cyber-quiz-attempts",
    "admin-cyber-quiz-certs",
    "admin-platform-stats",
    "admin-settings",
    "support", "verify",
    "instructors", "events",
    "blog",
    "admin-courses",
    "affiliate",
    "pricing",
    "admin-seo",
  ]
  if (knownViews.includes(parts[0] as View["name"])) {
    return { name: parts[0] as View["name"] } as View
  }

  // Unknown → fall back to home so the app never crashes on a bad URL
  return { name: "home" }
}

/* ----------------------------- side-effects ----------------------------- */

/** Push a view into the URL hash WITHOUT triggering a hashchange event
 *  (we use history.replaceState for the initial-load sync, and
 *  history.pushState for user-initiated navigation so the back button
 *  works). The store listener will pick up state changes. */
export function pushViewToHash(view: View) {
  if (typeof window === "undefined") return
  const hash = `#${viewToHash(view)}`
  // Only push if it actually changed — avoids spamming history
  if (window.location.hash !== hash) {
    window.history.pushState({ view }, "", hash)
  }
}

/** Replace the current hash without adding a history entry. Used for
 *  the initial-load sync so we don't pollute the back stack. */
export function replaceViewInHash(view: View) {
  if (typeof window === "undefined") return
  const hash = `#${viewToHash(view)}`
  if (window.location.hash !== hash) {
    window.history.replaceState({ view }, "", hash)
  }
}

/** Read the current view from the URL hash. SSR-safe (returns home). */
export function readViewFromHash(): View {
  if (typeof window === "undefined") return { name: "home" }
  return hashToView(window.location.hash)
}
