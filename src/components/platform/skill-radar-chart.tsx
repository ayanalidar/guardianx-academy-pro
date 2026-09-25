"use client"

/**
 * SkillRadarChart - before/after skill overlay for the course page's
 * "Skill Progression" section (V3).
 *
 * Lives in its own module so the course-detail view can React.lazy() it:
 * recharts then stays out of the main course-page chunk and loads only
 * when the section scrolls into view.
 */
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"

export interface SkillRadarPoint {
  skill: string
  before: number
  after: number
}

export default function SkillRadarChart({ points }: { points: SkillRadarPoint[] }) {
  if (!points || points.length < 3) return null

  return (
    <div className="w-full h-[300px] sm:h-[340px]" aria-label="Before and after skill levels chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={points} cx="50%" cy="50%" outerRadius="74%">
          <PolarGrid stroke="rgba(148,163,184,0.18)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "rgba(203,213,225,0.8)", fontSize: 10 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            name="Before"
            dataKey="before"
            stroke="#94a3b8"
            strokeWidth={1.5}
            fill="#94a3b8"
            fillOpacity={0.22}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Radar
            name="After"
            dataKey="after"
            stroke="#34d399"
            strokeWidth={2}
            fill="#34d399"
            fillOpacity={0.32}
            isAnimationActive
            animationDuration={1100}
            animationBegin={350}
            animationEasing="ease-out"
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: "rgba(203,213,225,0.85)", fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em" }}>
                {String(value).toUpperCase()}
              </span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
