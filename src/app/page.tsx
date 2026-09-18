"use client"

import { AppRoot } from "@/components/platform/app-root"

/**
 * Root route. All shell/session/view logic lives in AppRoot (shared with
 * the catch-all bridge route). Navigation is path-based
 * (`/skill-assessments`, not `/#/skill-assessments`) — legacy `#/…` URLs
 * are transparently rewritten to clean paths on load (see AppRoot).
 */
export default function Home() {
  return <AppRoot />
}
