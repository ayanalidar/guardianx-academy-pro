import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { title: "Verify Certificate | GuardianX Academy", description: "Public certificate verification. Enter a credential ID to verify any GuardianX Academy certification." }
export default function Page() { return <PublicRouteView initialView={{ name: "verify" }} /> }
