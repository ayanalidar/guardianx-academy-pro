import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { title: "GuardianX Cybersecurity Blog | Tips, Guides & Industry News", description: "Expert cybersecurity articles, certification guides, career advice, threat analysis, and how-to tutorials from GuardianX Academy." }
export default function Page() { return <PublicRouteView initialView={{ name: "blog" }} /> }
