"use client"

import * as React from "react"
import { useAppStore, type View } from "@/store/app-store"
import { viewToPath } from "@/lib/url-router"

/**
 * NavLink — a REAL anchor (`<a href>`) that navigates the SPA without a
 * full reload.
 *
 * Why not a plain `<button onClick={navigate}>`? Buttons broke:
 *   - SEO (no href for crawlers to follow)
 *   - open-in-new-tab / middle-click / Ctrl+click
 *   - the browser status-bar URL preview
 *   - standard keyboard/link semantics
 *
 * Behavior:
 *   - plain left-click  → preventDefault + `navigate(view)` (SPA, instant)
 *   - Ctrl/Cmd/Shift/Alt+click, middle-click, `target="_blank"` → native
 *     browser behavior (new tab/window) via the real href
 *   - href is the canonical path from `viewToPath()`
 */
export function NavLink({
  view,
  children,
  className,
  activeClassName,
  title,
  onNavigate,
  ...rest
}: {
  view: View
  children: React.ReactNode
  className?: string
  /** Extra class appended when this link matches the current view. */
  activeClassName?: string
  title?: string
  /** Optional callback fired after a successful SPA navigation. */
  onNavigate?: (view: View) => void
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const { view: currentView, navigate } = useAppStore()
  const href = viewToPath(view)

  const isActive =
    currentView.name === view.name &&
    (view.name === "home" ||
      JSON.stringify(currentView) === JSON.stringify(view))

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modified clicks (new tab / new window).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.button !== 0) return
    e.preventDefault()
    navigate(view)
    onNavigate?.(view)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={isActive && activeClassName ? `${className ?? ""} ${activeClassName}` : className}
      title={title}
      {...rest}
    >
      {children}
    </a>
  )
}
