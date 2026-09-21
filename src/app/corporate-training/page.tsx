import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = { alternates: { canonical: "/corporate-training" },
  title: "Corporate Training — Cyber Security Training for Teams",
  description:
    "Customized cyber security training for SOC, IT, GRC, and leadership teams. On-site, virtual, or hybrid delivery. Custom curriculum, dedicated batches, hands-on labs, L&D reporting. Request a proposal — our team responds within 1 business day.",
}

export default function Page() {
  return (
    <PublicRouteView initialView={{ name: "corporate-training" }} />
  )
}
