import Link from "next/link"

export default function NotFound() {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, background: "#0a0a12", color: "#e5e7eb", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div
              style={{
                fontSize: "88px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #a78bfa, #34d399)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                lineHeight: 1,
              }}
            >
              404
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "12px 0 8px" }}>
              Signal lost - page not found
            </h1>
            <p style={{ fontSize: "14px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "24px" }}>
              The page you requested doesn&apos;t exist or may have been moved.
              Try the courses catalog or head back to base.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "#7c3aed",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Back to Home
              </Link>
              <Link
                href="/courses"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  color: "#e5e7eb",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Browse Courses
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
