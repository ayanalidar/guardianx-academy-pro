import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { title: "Cybersecurity Career Learning Paths | GuardianX Academy", description: "Structured learning paths from beginner to job-ready. Penetration tester, SOC analyst, cloud security engineer, and more." }
export default function Page() { return <PublicRouteView initialView={{ name: "learning-paths" }} /> }
