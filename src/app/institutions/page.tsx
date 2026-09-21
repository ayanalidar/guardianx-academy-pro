import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/institutions" }, title: "Institutional Partnerships", description: "On-premises cybersecurity training for schools, colleges & universities. Dedicated portals, MoU partnerships, cyber range, and a complimentary School Management System for partners." }
export default function Page() { return <PublicRouteView initialView={{ name: "institutions" }} /> }
