import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/batches" }, title: "Upcoming Certification Batches", description: "Live instructor-led certification batches for CEH, Security+, CCNA, CISSP. Flexible schedules including weekday, weekend, morning, and evening batches." }
export default function Page() { return <PublicRouteView initialView={{ name: "batches" }} /> }
