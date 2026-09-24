/**
 * Course image mapping — three tiers:
 *  1. COURSE_SHORT_IMAGES: exact shortName → dedicated per-course cover
 *  2. COURSE_IMAGES: category fallback
 *  3. title/shortName keyword match
 * All local images are text-free (no garbled glyphs), brand-styled dark navy + violet/teal.
 */

export const COURSE_IMAGES: Record<string, string> = {
  "Ethical Hacking": "/courses/ethical-hacking.png",
  "Networking": "/courses/network-security.png",
  "Web Security": "/courses/web-security.png",
  "Cloud Security": "/courses/cloud-security.png",
  "Forensics": "/courses/digital-forensics.png",
  "System Administration": "/courses/soc-blue-team.png",
  "Security Management": "/courses/security-management.png",
  "Identity & Access": "/courses/iam.png",
  "Malware Analysis": "/courses/malware-analysis.png",
  "Penetration Testing": "/courses/penetration-testing.png",
  "AI Security": "/courses/ai-security.png",
  "Incident Response": "/courses/incident-response.png",
}

/** Per-course dedicated covers (checked first, before category fallbacks). */
export const COURSE_SHORT_IMAGES: Record<string, string> = {
  "CPENT": "/courses/cpent.png",
  "OSCP": "/courses/oscp.png",
  "OSEP": "/courses/osep.png",
  "CEH": "/courses/ceh.png",
  "VAPT": "/courses/vapt.png",
  "WAPT": "/courses/wapt.png",
  "EWPTX": "/courses/ewptx.png",
  "CCNA": "/courses/ccna.png",
  "CCNP ENTERPRISE": "/courses/ccnp-enterprise.png",
  "AWS-SEC": "/courses/aws-security.png",
  "AZ-500": "/courses/az-500.png",
  "RHCSA": "/courses/rhcsa.png",
  "CISSP": "/courses/cissp.png",
  "CISM": "/courses/cism.png",
  "CISA": "/courses/cisa.png",
  "ISO27001": "/courses/iso-27001.png",
  "GRC": "/courses/grc.png",
  "SOC": "/courses/soc.png",
  "CYBERARK": "/courses/cyberark.png",
}

/**
 * Get the best matching image for a course:
 * admin thumbnail > per-course cover > category > title keywords > default.
 */
export function getCourseImage(course: { category?: string; title?: string; shortName?: string; thumbnail?: string | null }): string {
  // Admin-uploaded custom thumbnail always wins
  if (course.thumbnail) return course.thumbnail

  // Dedicated per-course cover
  const short = (course.shortName || "").trim().toUpperCase()
  if (short && COURSE_SHORT_IMAGES[short]) {
    return COURSE_SHORT_IMAGES[short]
  }

  // Match by category
  if (course.category && COURSE_IMAGES[course.category]) {
    return COURSE_IMAGES[course.category]
  }

  // Match by title keywords
  const title = (course.title || "").toLowerCase()

  if (title.includes("ethical hack")) return COURSE_IMAGES["Ethical Hacking"]
  if (title.includes("network")) return COURSE_IMAGES["Networking"]
  if (title.includes("web")) return COURSE_IMAGES["Web Security"]
  if (title.includes("cloud")) return COURSE_IMAGES["Cloud Security"]
  if (title.includes("forensic")) return COURSE_IMAGES["Forensics"]
  if (title.includes("admin")) return COURSE_IMAGES["System Administration"]
  if (title.includes("management")) return COURSE_IMAGES["Security Management"]
  if (title.includes("identity") || title.includes("pam")) return COURSE_IMAGES["Identity & Access"]
  if (title.includes("malware") || title.includes("reverse")) return COURSE_IMAGES["Malware Analysis"]
  if (title.includes("penetrat")) return COURSE_IMAGES["Penetration Testing"]
  if (title.includes("ai ") || title.includes("artificial")) return COURSE_IMAGES["AI Security"]
  if (title.includes("incident") || title.includes("response")) return COURSE_IMAGES["Incident Response"]

  // Default
  return COURSE_IMAGES["Ethical Hacking"]
}

/**
 * Optional per-course YouTube trailer URLs, keyed by UPPERCASE shortName
 * (V1). Add an entry like "CEH": "https://www.youtube.com/embed/<id>" and
 * the course hero automatically shows a "Watch trailer" button + inline
 * player dialog. An empty map = the button stays hidden everywhere.
 */
export const COURSE_TRAILERS: Record<string, string> = {}

export function getCourseTrailer(shortName?: string | null): string | null {
  if (!shortName) return null
  return COURSE_TRAILERS[String(shortName).toUpperCase()] ?? null
}
