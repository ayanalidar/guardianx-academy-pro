"use client"

/**
 * GrowthChart - admin enrollment growth area chart, split out of
 * admin-dashboard.tsx so the heavy recharts bundle is code-split away from
 * the admin view's initial JS (loaded on demand via next/dynamic).
 */
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

export default function GrowthChart({ data }: { data: { month: string; enrollments: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.7 0.15 85)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="oklch(0.7 0.15 85)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
        <XAxis dataKey="month" stroke="oklch(0.68 0.012 260)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="oklch(0.68 0.012 260)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "oklch(0.1 0.008 270 / 0.95)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            borderRadius: "0.5rem",
            fontSize: "12px",
          }}
          labelStyle={{ color: "oklch(0.95 0.004 270)" }}
        />
        <Area
          type="monotone"
          dataKey="enrollments"
          stroke="oklch(0.7 0.15 85)"
          strokeWidth={2}
          fill="url(#gradEnroll)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
