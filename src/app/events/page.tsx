import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/events" }, title: "Cybersecurity Events, Workshops & CTFs", description: "Join cybersecurity workshops, webinars, CTF competitions, campus programs, and bootcamps. Live online and on-campus events." }
export default function Page() { return <PublicRouteView initialView={{ name: "events" }} /> }
