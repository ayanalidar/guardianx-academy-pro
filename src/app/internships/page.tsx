import type { Metadata } from "next"
import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata: Metadata = {
  alternates: { canonical: "/internships" },
  title: "Internships · Cyber Security Internship Program in India",
  description:
    "GuardianX Academy runs mentored cyber security internships in partnership with colleges across India - VAPT, SOC, GRC and Cloud Security tracks. Browse every partner college and its internships, meet showcased interns, and download or verify their internship certificates. Apply online, no account required.",
  openGraph: {
    title: "Internship Program · GuardianX Academy",
    description:
      "Mentored cyber security internships with partner colleges across India. VAPT, SOC, GRC and Cloud Security tracks with verifiable completion certificates. Apply online.",
    type: "website",
  },
}

/**
 * Dedicated /internships route (deep-linkable + crawlable, same pattern
 * as /hiring). PublicRouteView hydrates the SPA store and mounts the
 * InternshipsView through the public view registry (case "internships").
 */
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            name: "GuardianX Academy Cyber Security Internship Program",
            description:
              "Mentored cyber security internships in partnership with colleges across India - VAPT, SOC, GRC and Cloud Security tracks with verifiable completion certificates.",
            provider: {
              "@type": "EducationalOrganization",
              name: "GuardianX Academy",
              url: "https://academy.guardianx.cloud",
            },
            occupationalCategory: "Information Security",
            offers: { "@type": "Offer", category: "Internship" },
          }),
        }}
      />
      <PublicRouteView initialView={{ name: "internships" }} />
    </>
  )
}
