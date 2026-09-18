"use client"

/**
 * EmptyState — the ONE consistent "nothing here" treatment.
 *
 * Replaces the ~30 ad-hoc empty-text blocks across views with a single
 * component: tinted icon bubble, title, description, optional action.
 * Server-render safe (no hooks), so it can be used anywhere.
 */

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Primary call-to-action label. */
  actionLabel?: string
  onAction?: () => void
  /** Render action as a plain anchor instead of a button. */
  actionHref?: string
  /** Icon bubble tint classes, e.g. "text-cyan-300 bg-cyan-500/10 border-cyan-500/30". */
  tint?: string
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  tint = "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl",
        "border border-dashed border-border/60 bg-card/30",
        compact ? "p-6" : "p-10",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl border mb-3",
          compact ? "size-10" : "size-12",
          tint,
        )}
        aria-hidden
      >
        <Icon className={compact ? "size-5" : "size-6"} />
      </span>
      <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mt-1">{description}</p>
      )}
      {actionLabel && (onAction || actionHref) && (
        actionHref ? (
          <a
            href={actionHref}
            className="mt-4 inline-flex items-center justify-center rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 transition-colors"
          >
            {actionLabel}
          </a>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 inline-flex items-center justify-center rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 transition-colors"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}
