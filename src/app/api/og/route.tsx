import { ImageResponse } from "next/og"

/**
 * Dynamic Open-Graph image generator - branded share cards for
 * courses, batches, blog posts and any page that sets
 * openGraph.images to `/api/og?...`.
 *
 * Usage:
 *   /api/og?title=CEH+Training&kicker=COURSE&badge=EC-COUNCIL&accent=violet
 *
 * Returns a 1200×630 PNG. Relative image URLs in metadata are resolved
 * against metadataBase (https://academy.guardianx.cloud) by Next.js.
 */

export const runtime = "edge"

const ACCENTS: Record<string, { from: string; to: string; glow: string }> = {
  violet: { from: "#a78bfa", to: "#7c3aed", glow: "rgba(167,139,250,0.35)" },
  cyan: { from: "#67e8f9", to: "#0891b2", glow: "rgba(103,232,249,0.35)" },
  emerald: { from: "#34d399", to: "#059669", glow: "rgba(52,211,153,0.35)" },
  amber: { from: "#fbbf24", to: "#d97706", glow: "rgba(251,191,36,0.35)" },
  rose: { from: "#fb7185", to: "#e11d48", glow: "rgba(251,113,133,0.35)" },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get("title") || "GuardianX Academy").slice(0, 120)
  const kicker = (searchParams.get("kicker") || "CYBERSECURITY TRAINING").slice(0, 40)
  const badge = (searchParams.get("badge") || "").slice(0, 30)
  const accentKey = searchParams.get("accent") || "violet"
  const accent = ACCENTS[accentKey] ?? ACCENTS.violet

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0a0c12",
          backgroundImage:
            "radial-gradient(circle at 82% 12%, " + accent.glow + ", transparent 42%)," +
            "radial-gradient(circle at 8% 92%, rgba(103,232,249,0.14), transparent 38%)," +
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top row: brand + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                color: "white", fontSize: 30, fontWeight: 800,
              }}
            >
              GX
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#e5e7eb", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
                Guardian<span style={{ color: "#a78bfa" }}>X</span> Academy
              </span>
              <span style={{ color: "#6b7280", fontSize: 16, letterSpacing: 4 }}>
                SECURE THE FUTURE
              </span>
            </div>
          </div>
          {badge ? (
            <div
              style={{
                display: "flex", alignItems: "center",
                padding: "10px 22px", borderRadius: 999,
                border: "1px solid rgba(167,139,250,0.5)",
                background: "rgba(124,58,237,0.12)",
                color: "#c4b5fd", fontSize: 20, fontWeight: 700, letterSpacing: 2,
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        {/* middle: kicker + title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: "linear-gradient(90deg, " + accent.from + ", " + accent.to + ")" }} />
            <span style={{ color: "#67e8f9", fontSize: 22, fontWeight: 600, letterSpacing: 6 }}>
              {kicker.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              color: "#f3f4f6", fontSize: title.length > 72 ? 58 : 74,
              fontWeight: 800, lineHeight: 1.08, letterSpacing: -2,
              display: "flex", maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        {/* bottom row: highlights */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {["Instructor-led", "Hands-on Labs", "Certification Prep"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 20px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#9ca3af", fontSize: 19, fontWeight: 600,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, background: accent.from }} />
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
