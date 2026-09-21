import type { Metadata } from "next"
import { AppRoot } from "@/components/platform/app-root"

/**
 * Root route. All shell/session/view logic lives in AppRoot (shared with
 * the catch-all bridge route). Navigation is path-based
 * (`/skill-assessments`, not `/#/skill-assessments`) - legacy `#/…` URLs
 * are transparently rewritten to clean paths on load (see AppRoot).
 *
 * This file is a server component; AppRoot is the client boundary.
 * Metadata lives here so the homepage can emit its own self-referencing
 * canonical without the layout forcing one on every page.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default function Home() {
  return <AppRoot />
}
