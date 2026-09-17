import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/session"
import { parseCsvObjects, isValidEmail } from "@/lib/csv"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
    if (user instanceof NextResponse) return user

    const body = await req.json()
    const csv: string = typeof body.csv === "string" ? body.csv : ""
    if (!csv.trim()) {
      return NextResponse.json({ error: "csv field is required" }, { status: 400 })
    }

    const rows = parseCsvObjects(csv)
    const mapped = rows.map((r) => {
      const name = (r.name || r.fullname || r["full name"] || "").trim()
      const email = (r.email || r["e-mail"] || "").trim()
      const title = (r.title || "").trim()
      let error: string | undefined
      if (!name) error = "Missing name"
      else if (name.length < 2) error = "Name too short"
      else if (!isValidEmail(email)) error = "Invalid email"
      const valid = !error
      return { name, email, title, valid, error }
    })

    return NextResponse.json({
      rows: mapped,
      totalRows: mapped.length,
      validRows: mapped.filter((r) => r.valid).length,
    })
  } catch (e) {
    console.error("[bulk-import/preview]", e)
    return NextResponse.json({ error: "Preview failed" }, { status: 500 })
  }
}
