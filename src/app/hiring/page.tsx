import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = {
  alternates: { canonical: "/hiring" },
  title: "Hiring · Cybersecurity Jobs Worldwide",
  description:
    "GuardianX and partner companies are hiring security engineers, instructors, analysts and builders across every timezone. Remote-first, globally distributed, mission-driven roles across almost every discipline in technology: SOC analysts, penetration testers, DevSecOps, cloud security, GRC, software engineering, data & AI and more. Apply directly, no account required.",
  openGraph: {
    title: "Hiring · Cybersecurity Jobs Worldwide · GuardianX Academy",
    description:
      "GuardianX and partner companies are hiring across every timezone. Remote-first, globally distributed, mission-driven. Apply directly, no account required.",
    type: "website",
  },
}

export default function Page() {
  return <PublicRouteView initialView={{ name: "hiring" }} />
}
