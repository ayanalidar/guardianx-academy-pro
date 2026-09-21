import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/institutions/colleges" }, title: "Cybersecurity Training for Colleges", description: "Industry-aligned certification courses integrated into college curriculum with hands-on labs." }
export default function Page() { return <PublicRouteView initialView={{ name: "institutions-colleges" }} /> }
