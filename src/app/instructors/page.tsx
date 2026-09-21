import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/instructors" }, title: "Expert Cybersecurity Instructors", description: "Learn from verified cybersecurity instructors with real-world experience in penetration testing, SOC, cloud security, GRC, and more." }
export default function Page() { return <PublicRouteView initialView={{ name: "instructors" }} /> }
