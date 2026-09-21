import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/pricing" }, title: "Pricing & Subscription Plans", description: "Affordable cybersecurity training plans. Free, Pro, and Enterprise subscriptions with flexible pricing." }
export default function Page() { return <PublicRouteView initialView={{ name: "pricing" }} /> }
