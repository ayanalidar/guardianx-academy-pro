import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/contact" }, title: "Contact GuardianX Academy | Cybersecurity Training Inquiries", description: "Contact GuardianX Academy for cybersecurity training, institutional partnerships, batch enrollment, and corporate training." }
export default function Page() { return <PublicRouteView initialView={{ name: "contact" }} /> }
