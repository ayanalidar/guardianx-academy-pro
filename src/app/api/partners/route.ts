import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/partners - public endpoint, returns all partner institutions.
// Used by the public /partners page (no auth required).
export async function GET() {
  const partners = await db.partnerInstitution.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ partners })
}
