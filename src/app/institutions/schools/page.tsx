import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/institutions/schools" }, title: "Cybersecurity Training for Schools", description: "K-12 cybersecurity education programs with complimentary School Management System for MoU partners." }
export default function Page() { return <PublicRouteView initialView={{ name: "institutions-schools" }} /> }
