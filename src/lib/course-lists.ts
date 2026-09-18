/**
 * Course extras list helpers.
 *
 * The Course model stores the five "course extras" lists (whatYouWillLearn,
 * prerequisites, whoShouldAttend, toolsCovered, careerOutcomes) as
 * JSON-encoded string arrays in TEXT columns. These helpers are the single
 * place that knows the encoding — editors encode, readers parse.
 *
 * Design notes:
 * - JSON (not comma-separated like `tags`) because the items are full
 *   sentences that legitimately contain commas.
 * - Parsing NEVER throws: malformed/legacy data degrades to [] so the
 *   public page and editors can always render.
 * - `parseCourseList` also accepts a raw array (API consumers that already
 *   parsed) and comma-separated strings (tolerant of old-style input).
 */

export type CourseListKey =
  | "whatYouWillLearn"
  | "prerequisites"
  | "whoShouldAttend"
  | "toolsCovered"
  | "careerOutcomes"

export const COURSE_LIST_FIELDS: { key: CourseListKey; label: string; hint: string; placeholder: string }[] = [
  {
    key: "whatYouWillLearn",
    label: "What you will learn",
    hint: "Shown as the outcome checklist on the course page. One item per line.",
    placeholder: "Perform vulnerability assessments with Nmap and Nessus",
  },
  {
    key: "prerequisites",
    label: "Prerequisites",
    hint: "What students should know/have before starting. One item per line.",
    placeholder: "Basic understanding of networking (TCP/IP, DNS, HTTP)",
  },
  {
    key: "whoShouldAttend",
    label: "Who should attend",
    hint: "The 'Is this course right for you?' section. One item per line.",
    placeholder: "IT professionals moving into a security role",
  },
  {
    key: "toolsCovered",
    label: "Tools covered",
    hint: "Hands-on tools and technologies used in labs. One item per line.",
    placeholder: "Burp Suite",
  },
  {
    key: "careerOutcomes",
    label: "Career outcomes",
    hint: "Roles / results this course prepares students for. One item per line.",
    placeholder: "SOC Analyst (Tier 1)",
  },
]

/** Parse a stored course-list value into a clean string[]. Never throws. */
export function parseCourseList(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof raw !== "string") return []
  const value = raw.trim()
  if (!value || value === "[]") return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v).trim()).filter(Boolean)
    }
  } catch {
    // Fall through to legacy handling below.
  }
  // Legacy tolerance: comma-separated string (mirrors the `tags` column).
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

/** Encode a string[] for storage. Empty lists store as "[]". */
export function encodeCourseList(items: unknown): string {
  if (!Array.isArray(items)) return "[]"
  const clean = items.map((v) => String(v).trim()).filter(Boolean)
  return JSON.stringify(clean)
}

/**
 * Normalize any incoming editor payload (array, newline text, or stored
 * JSON string) into the canonical encoded string for DB storage.
 * Accepts newline-separated text from textareas, which is what both
 * editing surfaces (Course Studio, Admin → Courses) submit.
 */
export function normalizeCourseListInput(raw: unknown): string {
  if (raw == null) return "[]"
  if (Array.isArray(raw)) return encodeCourseList(raw)
  if (typeof raw !== "string") return "[]"
  const value = raw.trim()
  if (!value) return "[]"
  // If it's already a JSON array string, re-encode cleanly.
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return encodeCourseList(parsed)
    } catch {
      // Not valid JSON — treat as newline text below.
    }
  }
  return encodeCourseList(value.split("\n"))
}
