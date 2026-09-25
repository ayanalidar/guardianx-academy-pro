"use client"

/**
 * ViewEnter - keys its wrapper on the active SPA view name so every view
 * swap plays a short fade/slide-up enter animation. Purely presentational;
 * the animation is CSS-only and disabled under prefers-reduced-motion.
 */

import * as React from "react"
import { useAppStore } from "@/store/app-store"

export function ViewEnter({ children }: { children: React.ReactNode }) {
  const viewName = useAppStore((s) => s.view.name)
  return (
    <div key={viewName as string} className="gx-view-enter">
      {children}
    </div>
  )
}
