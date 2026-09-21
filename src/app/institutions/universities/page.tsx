import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/institutions/universities" }, title: "Cybersecurity Training for Universities", description: "Advanced research-grade cyber security labs, degree integration, and PhD-level coursework for universities." }
export default function Page() { return <PublicRouteView initialView={{ name: "institutions-universities" }} /> }
