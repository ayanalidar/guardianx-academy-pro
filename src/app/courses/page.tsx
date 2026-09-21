import { PublicRouteView } from "@/components/platform/public-route-view"
export const metadata = { alternates: { canonical: "/courses" }, title: "Cybersecurity Courses & Certifications", description: "Browse 29+ cybersecurity certification courses including CEH, CISSP, CCNA, CCNP, RHCSA, WAPT, OSCP, and CyberArk PAM. Live instructor-led training with hands-on labs.", keywords: ["cybersecurity courses", "CEH training", "CISSP course", "CCNA certification", "ethical hacking course", "India"] }
export default function Page() { return <PublicRouteView initialView={{ name: "catalog" }} /> }
// SEO routes — last updated Tue Sep  8 13:10:35 UTC 2026
