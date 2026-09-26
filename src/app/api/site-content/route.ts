import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


// GET /api/site-content - public endpoint, returns all site content as a
// { key: value } map. Used by the homepage and other public pages so that
// administrators can edit copy without redeploying.
export async function GET() {
  const items = await db.siteContent.findMany()
  const map: Record<string, string> = {}
  for (const item of items) {
    map[item.key] = typeof item.value === "string" ? item.value : JSON.stringify(item.value)
  }
  return NextResponse.json({ content: map, items })
}
