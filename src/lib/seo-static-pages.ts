/* ============================================================
   Shared definition of every STATIC public page the GuardianX
   SPA can render, used by BOTH:
     - /api/admin/seo/audit   (Health Score gauge)
     - /api/admin/seo/autopilot (one-click fixer)

   Single source of truth so the grader and the fixer can never
   drift apart. Dynamic pages (courses / blog / events / certs)
   are audited separately from the DB rows in each route.
   ============================================================ */

export interface PublicPageDef {
  name: string;
  pageKey: string;
  url: string;
  defaultTitle: string;
  defaultDescription: string;
  /** Approximate word count we expect if CMS is empty
   *  (used only as a sanity floor). */
  minWords?: number;
}

export const STATIC_PAGES: PublicPageDef[] = [
  {
    name: "Homepage",
    pageKey: "home",
    url: "/",
    defaultTitle: "GuardianX Academy - Cyber Security Training Operating System",
    defaultDescription:
      "Master cybersecurity by actually breaking things. Real cyber range, hands-on labs, certification tracks, CTF arena, and career paths. Learn. Break. Defend. Prove.",
    minWords: 600,
  },
  {
    name: "Contact",
    pageKey: "contact",
    url: "/#/contact",
    defaultTitle: "Contact GuardianX Academy",
    defaultDescription:
      "Have questions about courses, partnerships, or anything else? Our team responds fast - reach out and we'll get back to you within 24 hours.",
    minWords: 200,
  },
  {
    name: "Institutions - Schools",
    pageKey: "institutions-schools",
    url: "/#/institutions-schools",
    defaultTitle: "Cyber Security Training for Schools - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for secondary schools. Dedicated login portal, age-appropriate curriculum, shared cyber range, and joint certifications.",
    minWords: 300,
  },
  {
    name: "Institutions - Colleges",
    pageKey: "institutions-colleges",
    url: "/#/institutions-colleges",
    defaultTitle: "Cyber Security Training for Colleges - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for colleges and professional institutes. Dedicated login portal, lab access, and industry-recognized certifications.",
    minWords: 300,
  },
  {
    name: "Institutions - Universities",
    pageKey: "institutions-universities",
    url: "/#/institutions-universities",
    defaultTitle: "Cyber Security Training for Universities - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for research universities. Dedicated cyber range, joint certifications, research-grade labs, and curriculum alignment.",
    minWords: 300,
  },
  {
    name: "Course Catalog",
    pageKey: "catalog",
    url: "/#/catalog",
    defaultTitle: "Course Catalog - GuardianX Academy",
    defaultDescription:
      "Browse 27+ certification tracks across ethical hacking, networking, web security, system administration, IAM, and cloud security - from beginner to advanced.",
    minWords: 250,
  },
  {
    name: "Training Batches",
    pageKey: "batches",
    url: "/#/batches",
    defaultTitle: "Upcoming Training Batches - GuardianX Academy",
    defaultDescription:
      "Find upcoming live training batches for CEH, CCNA, RHCSA, CISSP, and more - with dates, instructors, mode, and availability.",
    minWords: 200,
  },
  {
    name: "Cyber Range",
    pageKey: "cyber-range",
    url: "/#/cyber-range",
    defaultTitle: "Cyber Range - Live Attack & Defend - GuardianX Academy",
    defaultDescription:
      "Train against real targets in a live cyber range. Docker-powered vulnerable systems you can attack, exploit, and defend. 31+ scenarios.",
    minWords: 250,
  },
  {
    name: "Learning Paths",
    pageKey: "learning-paths",
    url: "/#/learning-paths",
    defaultTitle: "Learning Paths - GuardianX Academy",
    defaultDescription:
      "Guided multi-course learning paths that take you from beginner to job-ready. Each path includes hands-on labs, projects, and certifications.",
    minWords: 200,
  },
  {
    name: "Skill Tree",
    pageKey: "skill-tree",
    url: "/#/skill-tree",
    defaultTitle: "Skill Tree - GuardianX Academy",
    defaultDescription:
      "Visualize your cyber security skill tree. Unlock nodes by completing courses, labs, and certifications - and track progress to mastery.",
    minWords: 150,
  },
  {
    name: "Proctored Exams",
    pageKey: "exams",
    url: "/#/exams",
    defaultTitle: "Proctored Exams - GuardianX Academy",
    defaultDescription:
      "Schedule and take proctored certification exams. Identity-verified, browser-locked, and recorded for integrity. Verified digital certificates on pass.",
    minWords: 150,
  },
  {
    name: "Credentials",
    pageKey: "credentials",
    url: "/#/credentials",
    defaultTitle: "My Credentials - GuardianX Academy",
    defaultDescription:
      "View and verify your earned GuardianX credentials and industry certifications. Each credential is verifiable via a public URL.",
    minWords: 150,
  },
  {
    name: "Support",
    pageKey: "support",
    url: "/#/support",
    defaultTitle: "Support Center - GuardianX Academy",
    defaultDescription:
      "Help articles, FAQ, and contact options for GuardianX Academy. Get help with courses, payments, certificates, and platform issues.",
    minWords: 150,
  },
  {
    name: "Verify Credential",
    pageKey: "verify",
    url: "/#/verify",
    defaultTitle: "Verify a Credential - GuardianX Academy",
    defaultDescription:
      "Verify the authenticity of any GuardianX-issued credential. Enter the credential ID to confirm its validity, recipient, and issue date.",
    minWords: 100,
  },
  {
    name: "Instructors",
    pageKey: "instructors",
    url: "/#/instructors",
    defaultTitle: "Instructors - GuardianX Academy",
    defaultDescription:
      "Meet the GuardianX instructors - industry practitioners in ethical hacking, network security, IAM, and cloud defense with years of field experience.",
    minWords: 200,
  },
  {
    name: "Events & Webinars",
    pageKey: "events",
    url: "/#/events",
    defaultTitle: "Events & Webinars - GuardianX Academy",
    defaultDescription:
      "Upcoming cyber security workshops, webinars, CTFs, bootcamps, and awareness sessions. Register online - most events are free.",
    minWords: 200,
  },
  {
    name: "Blog",
    pageKey: "blog",
    url: "/#/blog",
    defaultTitle: "Blog - GuardianX Academy",
    defaultDescription:
      "Threat analysis, how-to guides, certification tips, and industry news from the GuardianX community of practitioners and instructors.",
    minWords: 200,
  },
  {
    name: "Pricing",
    pageKey: "pricing",
    url: "/#/pricing",
    defaultTitle: "Pricing - GuardianX Academy",
    defaultDescription:
      "Simple, transparent pricing for learners, teams, and institutions. Free to start - no credit card required. Pro and Enterprise plans available.",
    minWords: 200,
  },
];
