import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/affiliate/track?code=<code> - public.
 * Increments clicks + creates an AffiliateClick record, then redirects
 * to the homepage. Used as the referral link target (the affiliate's
 * referral link points to this endpoint with their unique code).
 *
 * Query params:
 *   code   (required) - the affiliate referral code
 *   course (optional) - a courseId to associate with the click (for
 *                       attribution when the link is placed on a course page)
 *
 * Behaviour:
 *   - If the code is missing or invalid, redirect to home anyway (don't 404
 *     in the browser - that's a poor UX for a referral link click).
 *   - IP + userAgent are best-effort from the request headers.
 *   - Always redirects to "/#/" so the user lands on the homepage.
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")?.trim().toUpperCase()
  const courseId = url.searchParams.get("course") || null

  if (code) {
    const affiliate = await db.affiliate.findUnique({ where: { code } })
    if (affiliate && affiliate.active) {
      // Capture IP + UA (best-effort)
      const headers = req.headers
      const ip =
        headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headers.get("x-real-ip") ||
        ""
      const userAgent = headers.get("user-agent") || ""

      // Increment clicks + log the click in a single transaction so the
      // counter never drifts from the click log.
      await db.$transaction([
        db.affiliate.update({
          where: { id: affiliate.id },
          data: { clicks: { increment: 1 } },
        }),
        db.affiliateClick.create({
          data: {
            affiliateId: affiliate.id,
            ip,
            userAgent,
            courseId: courseId ?? null,
          },
        }),
      ])
    }
  }

  // Always redirect to home - referral links should land on the homepage
  const homeUrl = new URL("/", req.url)
  return NextResponse.redirect(homeUrl, 302)
})
