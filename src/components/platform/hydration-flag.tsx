"use client"

import * as React from "react"

/**
 * Adds the `gx-hydrated` class to <html> once React hydration has completed.
 *
 * Why this exists: the site uses framer-motion reveals that keep content at
 * opacity: 0 until an IntersectionObserver fires. If hydration ever fails in
 * a user's browser (stale chunks, a mid-hydration crash, blocked JS), that
 * content would otherwise stay INVISIBLE FOREVER - pages look empty even
 * though the server rendered everything (the "no courses" bug).
 *
 * globals.css arms a failsafe that forces all reveal targets visible when
 * `gx-hydrated` is NOT present shortly after load. This component is the
 * signal that disarms the failsafe in healthy browsers, keeping animations.
 */
export function HydrationFlag() {
  React.useEffect(() => {
    document.documentElement.classList.add("gx-hydrated")
  }, [])
  return null
}
