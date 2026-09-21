import { PublicRouteView } from "@/components/platform/public-route-view"

export const metadata = { alternates: { canonical: "/institutions/open-schooling" },
  title: "Open Schooling — Complete 10th & 12th",
  description:
    "Complete your 10th (Secondary) or 12th (Senior Secondary) through open schooling. Recognized by NEP 2020 and COBSE. Valid for higher education and government jobs. Register online — our counsellor contacts you within 24 hours.",
}

export default function Page() {
  return (
    <PublicRouteView initialView={{ name: "institutions-open-schooling" }} />
  )
}
