import { PublicRouteView } from "@/components/platform/public-route-view"


export const metadata = {
  title: "Cyber Range — Hands-On Hacking Labs | GuardianX Academy",
  description: "Spin up real isolated targets in seconds. Probe, break, and capture flags in a real cyber range environment.",
}

export default function Page() {
  return (
    <PublicRouteView initialView={{ name: "cyber-range" }} />
  )
}
