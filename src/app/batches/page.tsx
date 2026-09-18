import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { title: "Upcoming Certification Batches | GuardianX Academy", description: "Live instructor-led certification batches for CEH, Security+, CCNA, CISSP. Flexible schedules including weekday, weekend, morning, and evening batches." }
export default function Page() { return <PublicRouteView initialView={{ name: "batches" }} /> }
