import { PublicRouteView } from "@/components/platform/public-route-view"
import type { View } from "@/store/app-store"

export const metadata = { alternates: { canonical: "/verify" }, title: "Verify Certificate", description: "Public certificate verification. Enter a credential ID to verify any GuardianX Academy certification." }

/**
 * /verify - dedicated public verification page.
 *
 * Certificate links stored in the database and shared across WhatsApp /
 * LinkedIn arrive in THREE shapes and ALL must auto-verify:
 *   /verify?credentialId=GX-…
 *   /verify?id=GX-…               ← what CyberQuizCertificate rows store
 *   /verify?certificateId=GX-…    ← what the homepage verify card uses
 * (path-segment form /verify/GX-… is handled by the [...gx] catch-all).
 *
 * The credentialId MUST be forwarded into initialView - previously this
 * page hardcoded { name: "verify" } and silently dropped every query
 * param, so opening a certificate link rendered the empty search box
 * instead of the verified certificate ("certificate doesn't open").
 */
function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v ?? undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const credentialId =
    firstParam(sp.credentialId) ?? firstParam(sp.id) ?? firstParam(sp.certificateId) ?? undefined
  const trimmed = credentialId?.trim() || undefined

  const initialView: View = trimmed
    ? { name: "verify", credentialId: trimmed }
    : { name: "verify" }

  return <PublicRouteView initialView={initialView} />
}
