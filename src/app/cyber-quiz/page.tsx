import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = {
  title: "Cyber Security Foundation Quiz — Free Public Quiz + ₹199 Certificate | GuardianX Academy",
  description:
    "Test your cyber awareness with 30 questions across 8 domains. Pass at 50% to unlock a verifiable Cyber Security Foundation certificate + detailed progress report. Shareable to LinkedIn + WhatsApp. ₹199 one-time fee.",
}

export default function Page() {
  return (
    <PublicRouteView initialView={{ name: "cyber-quiz" }} />
  )
}
