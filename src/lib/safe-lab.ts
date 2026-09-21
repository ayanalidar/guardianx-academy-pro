/**
 * Safe serializer for Lab records.
 *
 * The `flag` field holds the CTF answer and must NEVER be shipped to the
 * client in listing or detail responses - otherwise anyone can `curl
 * /api/labs` and capture every flag without solving anything (master-
 * prompt §34, §80-81). The flag is only ever returned from the
 * `/api/labs/[slug]/submit` route AFTER a correct submission.
 *
 * Use `safeLab()` on every public lab response.
 */
import type { Lab } from "@prisma/client"

type SafeLab = Omit<Lab, "flag"> & { flag?: never }

/** Strip the `flag` field from a Lab record. Returns a new object. */
export function safeLab<T extends Lab | null | undefined>(lab: T): T extends null ? null : T extends undefined ? undefined : SafeLab {
  if (!lab) return lab as any
  const { flag: _flag, ...rest } = lab
  return rest as any
}

/** Strip the `flag` field from an array of Lab records. */
export function safeLabs(labs: Lab[]): SafeLab[] {
  return labs.map((l) => safeLab(l))
}
