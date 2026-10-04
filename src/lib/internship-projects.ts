/**
 * Internship project entries - shared normalize/serialize helpers.
 *
 * The InternshipRecord.projects column stores a JSON array of
 * { title, description } objects (see prisma/schema.prisma).
 *
 * HISTORY (why this helper exists): the admin form used to send
 * structured { title, description } objects but the API ran them
 * through a generic String()-flattening helper, so rows were saved
 * as literal '["[object Object]","[object Object]"]' - the public
 * page then rendered "object Object, object Object". All write
 * paths now go through projectsJson() and every read path heals
 * legacy corrupted rows through normalizeProjectEntries().
 *
 * PURE module (no db import) - safe for both API routes and the
 * admin client bundle.
 */

export type ProjectEntry = { title: string; description: string }

const MAX_PROJECTS = 25
const MAX_TITLE = 200
const MAX_DESCRIPTION = 1000

// Literal JavaScript default-toString artifacts from the old bug.
const OBJECT_OBJECT = /^\[object\s+object\]$/i

function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

/**
 * Normalize any incoming shape into clean { title, description }[].
 * Accepts:
 *  - ProjectEntry[] / unknown[]           (already-parsed arrays)
 *  - JSON strings of such arrays          (DB column content)
 *  - plain text                           (fallback: split on | or newlines)
 * Legacy corrupted items (the string "[object Object]", objects with
 * no usable title) are DROPPED so public surfaces never show them.
 */
export function normalizeProjectEntries(v: unknown): ProjectEntry[] {
  let raw: unknown[] = []

  if (Array.isArray(v)) {
    raw = v
  } else if (typeof v === "string") {
    const t = v.trim()
    if (!t) return []
    try {
      const parsed = JSON.parse(t)
      if (!Array.isArray(parsed)) return []
      raw = parsed
    } catch {
      // Plain text fallback - project titles may contain commas, so only
      // split on pipes and newlines.
      raw = t.split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean)
    }
  } else {
    return []
  }

  const out: ProjectEntry[] = []
  for (const item of raw.slice(0, MAX_PROJECTS)) {
    if (item == null) continue

    if (typeof item === "string") {
      const title = item.trim()
      if (!title || OBJECT_OBJECT.test(title)) continue
      out.push({ title: title.slice(0, MAX_TITLE), description: "" })
      continue
    }

    if (typeof item === "object") {
      const o = item as Record<string, unknown>
      const title = cleanText(o.title, MAX_TITLE)
      const description = cleanText(o.description, MAX_DESCRIPTION)
      if (OBJECT_OBJECT.test(title)) continue
      if (!title && !description) continue
      // Title is what public surfaces render - if only a description was
      // given, use its head as the title instead of dropping the data.
      out.push({
        title: title || description.slice(0, 80),
        description,
      })
    }
  }
  return out
}

/** Serialize any incoming shape into the canonical DB column value. */
export function projectsJson(v: unknown): string {
  return JSON.stringify(normalizeProjectEntries(v))
}
