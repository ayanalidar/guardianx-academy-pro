import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = {
  alternates: { canonical: "/placements" },
  title: "Placements · Student Outcomes Wall · GuardianX Academy",
  description:
    "Real GuardianX Academy students placed into SOC analyst, penetration testing, cloud security, GRC and DevSecOps roles - verified outcomes with packages, tracks and stories. Follow the same placement-cell pipeline: train, certify, prove skills, interview, get hired.",
  openGraph: {
    title: "Placements · Student Outcomes Wall · GuardianX Academy",
    description:
      "Verified placement outcomes from GuardianX Academy - real students, real offers, real packages. See the wall and start your own placement journey.",
    type: "website",
  },
}

export default function Page() {
  return <PublicRouteView initialView={{ name: "placements" }} />
}
