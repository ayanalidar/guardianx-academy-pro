import type { Metadata } from "next"
import Link from "next/link"
import { RESET_INLINE_SCRIPT } from "@/lib/client-reset"

export const metadata: Metadata = {
  title: "Resetting GuardianX…",
  robots: { index: false, follow: false },
}

/**
 * /reset - self-service escape hatch for wedged browser sessions.
 *
 * If a user's tab is stuck on an old cached build (service worker holding
 * stale assets, dead chunk references, ghost catalog), sending them to
 * /reset wipes every client-side artifact and bounces them into a fresh
 * load. The heavy lifting runs as an inline script at HTML-parse time - 
 * BEFORE React hydrates - so it completes even if the surrounding app
 * never becomes interactive. The markup below is just the visible
 * acknowledgment plus a manual fallback link.
 */
export default function ResetPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-6">
      <script dangerouslySetInnerHTML={{ __html: RESET_INLINE_SCRIPT }} />
      <script
        dangerouslySetInnerHTML={{
          // Land on /diag?go=1 (a never-cached standalone page): it verifies the
          // delivered build matches origin and auto-continues to the catalog
          // ONLY when everything is healthy - instead of blindly bouncing into
          // a /courses URL the preview gateway may still serve from a stale pin.
          __html: `setTimeout(function(){try{location.replace("/diag?go=1&t="+Date.now())}catch(e){location.href="/diag"}},1200)`,
        }}
      />
      <div className="w-full max-w-md rounded-2xl border border-violet-500/20 bg-slate-900/60 p-8 text-center">
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-2xl"
          aria-hidden
        >
          🛠️
        </div>
        <h1 className="text-lg font-semibold">Resetting offline data…</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          Clearing cached pages, service workers, and stored snapshots.
          Next you&apos;ll see a quick health check that confirms your browser
          is on the current build before opening the catalog.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-md bg-violet-600 px-4 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
        >
          Go to the catalog now
        </Link>
      </div>
    </div>
  )
}
