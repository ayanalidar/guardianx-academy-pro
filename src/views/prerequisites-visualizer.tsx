"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  GitBranch,
  ArrowRight,
  X,
  Network,
  Users,
  Clock,
  Star,
} from "lucide-react"
import { ScrollReveal } from "@/components/platform/motion-system"

/* ============================================================
   PrerequisitesVisualizerView
   Pure CSS / SVG graph - courses as nodes, prereqs as edges.
   Click a course to see details.
   ============================================================ */

interface GraphNode {
  id: string
  title: string
  shortName: string
  category: string
  level: string
  durationHours: number
  color: string
  studentsCount: number
  rating: number
  description: string
  prerequisiteCount: number
}

interface GraphEdge {
  from: string
  to: string
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  categories: string[]
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Certification: "oklch(0.6 0.2 295)",
  Networking: "oklch(0.65 0.12 200)",
  "Cloud Security": "oklch(0.7 0.15 155)",
  "Web Security": "oklch(0.65 0.18 85)",
  Cryptography: "oklch(0.65 0.18 25)",
  Governance: "oklch(0.58 0.18 300)",
  "Offensive Security": "oklch(0.6 0.2 25)",
  Forensics: "oklch(0.7 0.15 85)",
  "Identity & Access": "oklch(0.65 0.1 185)",
}

function colorForCategory(cat: string): string {
  return CATEGORY_COLOR_MAP[cat] ?? "oklch(0.6 0.2 295)"
}

const LEVEL_ORDER: Record<string, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
}

export function PrerequisitesVisualizerView() {
  const { data, isLoading } = useQuery<GraphData>({
    queryKey: ["prerequisites-graph"],
    queryFn: () => api("/api/prerequisites-graph"),
  })

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)

  const nodes = data?.nodes ?? []
  const edges = data?.edges ?? []
  const categories = data?.categories ?? []

  // Compute layout: group by level → columns; sort by category within column
  const levelBuckets: Record<string, GraphNode[]> = { Beginner: [], Intermediate: [], Advanced: [] }
  for (const n of nodes) {
    const lvl = LEVEL_ORDER[n.level] !== undefined ? n.level : "Intermediate"
    ;(levelBuckets[lvl] ??= []).push(n)
  }
  for (const k of Object.keys(levelBuckets)) {
    levelBuckets[k].sort((a, b) => a.category.localeCompare(b.category) || a.shortName.localeCompare(b.shortName))
  }

  // Position calc - column per level, vertical spread within
  const colWidth = 280
  const rowHeight = 110
  const padX = 60
  const padY = 60
  const totalRows = Math.max(...Object.values(levelBuckets).map((b) => b.length), 1)
  const height = Math.max(640, totalRows * rowHeight + padY * 2)
  const width = 3 * colWidth + padX * 2

  const positionMap = new Map<string, { x: number; y: number; level: string }>()
  const levels = ["Beginner", "Intermediate", "Advanced"]
  levels.forEach((lvl, colIdx) => {
    const bucket = levelBuckets[lvl] ?? []
    bucket.forEach((n, rowIdx) => {
      // Center vertically
      const colHeight = bucket.length * rowHeight
      const startY = (height - colHeight) / 2
      const x = padX + colIdx * colWidth
      const y = startY + rowIdx * rowHeight
      positionMap.set(n.id, { x, y, level: lvl })
    })
  })

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null
  const selectedPrereqs = selectedNode
    ? edges.filter((e) => e.to === selectedNode.id).map((e) => nodes.find((n) => n.id === e.from)).filter(Boolean) as GraphNode[]
    : []
  const selectedDependents = selectedNode
    ? edges.filter((e) => e.from === selectedNode.id).map((e) => nodes.find((n) => n.id === e.to)).filter(Boolean) as GraphNode[]
    : []

  const isEdgeHighlighted = (e: GraphEdge) =>
    selectedId && (e.from === selectedId || e.to === selectedId) ||
    hoveredId && (e.from === hoveredId || e.to === hoveredId)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
              COURSE PREREQUISITES · LEARNING PATH MAP
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Learning <span className="text-gradient-premium">Graph</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-8">
            Explore how courses depend on each other. Beginner → Intermediate → Advanced. Click any node to inspect prerequisites and unlock paths.
          </p>
        </ScrollReveal>

        {/* Legend */}
        <ScrollReveal delay={0.25}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {categories.map((c) => (
              <div key={c} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colorForCategory(c) }}
                />
                <span className="text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {isLoading ? (
          <Skeleton className="h-[640px] rounded-2xl" />
        ) : nodes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Network className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No courses published yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Graph */}
            <div className="lg:col-span-2">
              <div className="relative overflow-auto rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
                <svg
                  width={width}
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  className="block mx-auto"
                  style={{ minWidth: width, minHeight: height }}
                >
                  {/* Edges */}
                  <defs>
                    <marker
                      id="arrow-default"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.4 0.05 270)" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.6 0.2 295)" />
                    </marker>
                  </defs>
                  {edges.map((e, i) => {
                    const from = positionMap.get(e.from)
                    const to = positionMap.get(e.to)
                    if (!from || !to) return null
                    // Curved path from prereq (from) → course (to)
                    const fromX = from.x + 130 // right side of node
                    const fromY = from.y + 22
                    const toX = to.x // left side of node
                    const toY = to.y + 22
                    const midX = (fromX + toX) / 2
                    const highlighted = isEdgeHighlighted(e)
                    const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
                    return (
                      <path
                        key={i}
                        d={d}
                        fill="none"
                        stroke={highlighted ? "oklch(0.6 0.2 295)" : "oklch(0.4 0.05 270)"}
                        strokeWidth={highlighted ? 2 : 1.2}
                        opacity={highlighted ? 0.9 : 0.5}
                        markerEnd={`url(#${highlighted ? "arrow-active" : "arrow-default"})`}
                      />
                    )
                  })}

                  {/* Nodes */}
                  {nodes.map((n) => {
                    const pos = positionMap.get(n.id)
                    if (!pos) return null
                    const isSelected = n.id === selectedId
                    const isHovered = n.id === hoveredId
                    const isConnected = selectedId
                      ? edges.some((e) => (e.from === selectedId && e.to === n.id) || (e.to === selectedId && e.from === n.id))
                      : false
                    const color = colorForCategory(n.category)
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(isSelected ? null : n.id)}
                        onMouseEnter={() => setHoveredId(n.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <rect
                          width={130}
                          height={44}
                          rx={8}
                          fill={isSelected ? "oklch(0.22 0.04 295)" : isHovered ? "oklch(0.2 0.015 270)" : "oklch(0.18 0.012 270)"}
                          stroke={isSelected ? color : isConnected ? color : "oklch(1 0 0 / 0.12)"}
                          strokeWidth={isSelected ? 2 : isConnected ? 1.5 : 1}
                          opacity={selectedId && !isSelected && !isConnected ? 0.45 : 1}
                          style={{ transition: "all 0.2s ease" }}
                        />
                        {/* Color dot */}
                        <circle cx={12} cy={22} r={4} fill={color} />
                        <text
                          x={22}
                          y={18}
                          className="fill-foreground"
                          style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-geist-mono)" }}
                        >
                          {n.shortName}
                        </text>
                        <text
                          x={22}
                          y={32}
                          className="fill-muted-foreground"
                          style={{ fontSize: 9 }}
                        >
                          {n.level}
                        </text>
                      </g>
                    )
                  })}

                  {/* Column headers */}
                  {levels.map((lvl, i) => (
                    <text
                      key={lvl}
                      x={padX + i * colWidth + 65}
                      y={30}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", letterSpacing: "0.2em" }}
                    >
                      {lvl.toUpperCase()}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Side panel - selected course details */}
            <div>
              <div className="mb-4">
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.3em] mb-2">DETAILS</p>
                <h3 className="text-xl font-bold tracking-tight">
                  {selectedNode ? selectedNode.shortName : "Select a course"}
                </h3>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card shadow-lg p-5">
                {!selectedNode ? (
                  <div className="text-center py-10">
                    <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click any node to inspect its prerequisites, dependents, and learning path.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: colorForCategory(selectedNode.category) }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em]">
                          {selectedNode.category.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-base mb-1">{selectedNode.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-3">{selectedNode.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/30 px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">Level</div>
                        <div className="font-medium">{selectedNode.level}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">Duration</div>
                        <div className="font-medium">{selectedNode.durationHours}h</div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">Students</div>
                        <div className="font-medium flex items-center gap-1">
                          <Users className="h-3 w-3" />{selectedNode.studentsCount}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-3 py-2">
                        <div className="text-[10px] text-muted-foreground">Rating</div>
                        <div className="font-medium flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-300" />{selectedNode.rating != null ? Number(selectedNode.rating).toFixed(1) : " - "}
                        </div>
                      </div>
                    </div>

                    {/* Prerequisites */}
                    <div>
                      <div className="text-[10px] font-mono text-amber-300 tracking-[0.2em] mb-2">
                        PREREQUISITES ({selectedPrereqs.length})
                      </div>
                      {selectedPrereqs.length === 0 ? (
                        <div className="text-xs text-muted-foreground">None - this is an entry point.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedPrereqs.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedId(p.id)}
                              className="w-full text-left rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 hover:border-amber-500/40 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-mono text-amber-300">{p.shortName}</div>
                                <div className="text-[10px] text-muted-foreground line-clamp-1">{p.title}</div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unlocks (dependents) */}
                    <div>
                      <div className="text-[10px] font-mono text-emerald-300 tracking-[0.2em] mb-2">
                        UNLOCKS ({selectedDependents.length})
                      </div>
                      {selectedDependents.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No courses depend on this one.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedDependents.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedId(d.id)}
                              className="w-full text-left rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 hover:border-emerald-500/40 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-mono text-emerald-300">{d.shortName}</div>
                                <div className="text-[10px] text-muted-foreground line-clamp-1">{d.title}</div>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedId(null)}
                      className="w-full text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" /> Clear selection
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats footer */}
              <div className="mt-4 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gradient-premium">{nodes.length}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">COURSES</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gradient-premium">{edges.length}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">EDGES</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gradient-premium">{categories.length}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">CATEGORIES</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
