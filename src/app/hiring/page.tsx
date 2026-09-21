import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = {
  alternates: { canonical: "/hiring" },
  title: "Hiring — Cybersecurity Job Openings Worldwide",
  description:
    "GuardianX Academy and partner companies are hiring worldwide — security engineers, SOC analysts, penetration testers, instructors and more. Remote-friendly roles across every timezone.",
}

export default function Page() {
  return <PublicRouteView initialView={{ name: "hiring" }} />
}
