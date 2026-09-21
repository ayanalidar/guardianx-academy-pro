/**
 * Custom next-auth adapter backed by our Prisma schema.
 *
 * WHY THIS EXISTS
 * ---------------
 * next-auth v4 HARD-REQUIRES an adapter whenever the Email (magic link)
 * provider is registered - assertConfig() returns MissingAdapter otherwise,
 * and that failure breaks EVERY auth endpoint (including plain email +
 * password login) with the built-in "Server error / There is a problem
 * with the server configuration." page. Commit 03c571a made the Email
 * provider activate as soon as SMTP settings exist, which is exactly how
 * production login broke.
 *
 * This adapter satisfies that requirement while keeping our architecture
 * intact:
 *   - Sessions stay JWT (strategy: "jwt") - the session-store methods are
 *     never called by next-auth in that mode and are deliberately absent
 *     / no-op.
 *   - Users live in our existing `User` table (required `passwordHash`,
 *     role, etc.) - we map to/from next-auth's AdapterUser shape here so
 *     the rest of the app never has to care.
 *   - We intentionally DO NOT persist OAuth accounts (no Account table):
 *     getUserByAccount() always returns null and linkAccount() is a no-op.
 *     The signIn callback in src/lib/auth.ts already creates/links users
 *     by email, which keeps behavior identical to the pre-adapter flow.
 *
 * METHODS next-auth ACTUALLY CALLS in our configuration (JWT strategy):
 *   email flow    → createVerificationToken, useVerificationToken,
 *                   getUserByEmail, getUser, updateUser, createUser*
 *   oauth flow    → getUserByAccount (always null), getUserByEmail,
 *                   linkAccount (no-op), getUser, createUser*
 *   credentials   → none (authorize() is fully responsible)
 *   session (jwt) → none
 *   (*) createUser is only reached if the signIn callback didn't already
 *       create the user - implemented defensively anyway.
 */

import type {
  Adapter,
  AdapterUser,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"

/**
 * Sentinel password hash for accounts created by the adapter (OAuth /
 * magic-link only). The plaintext is never stored or used - the hash just
 * satisfies the NOT NULL constraint and makes credentials login for these
 * accounts impossible. Random per call so attackers can't identify
 * OAuth-only accounts by a constant hash prefix.
 */
export function oauthPlaceholderHash(): string {
  const random = randomBytes(32).toString("hex")
  return bcrypt.hashSync(random, 12)
}

/** Map our Prisma User row to next-auth's AdapterUser. */
function toAdapterUser(user: {
  id: string
  email: string
  name: string
  avatar: string | null
}): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    // next-auth types this as Date | null; we don't track email
    // verification on our User model - null is the honest value.
    emailVerified: null,
    name: user.name,
    image: user.avatar,
  } as AdapterUser
}

export const prismaAuthAdapter: Adapter = {
  /**
   * Create a user from an OAuth/magic-link profile. Only fields next-auth
   * supplies (email, name, image) exist - everything our schema requires
   * gets safe defaults so first-time social logins land as STUDENTs.
   */
  async createUser(profile) {
    const email = profile.email!.toLowerCase()
    const user = await db.user.create({
      data: {
        email,
        name: profile.name ?? email.split("@")[0],
        passwordHash: oauthPlaceholderHash(),
        role: "STUDENT",
        title: "Student",
        avatar: profile.image ?? null,
      },
    })
    return toAdapterUser(user)
  },

  async getUser(id) {
    const user = await db.user.findUnique({ where: { id } })
    return user ? toAdapterUser(user) : null
  },

  async getUserByEmail(email) {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    return user ? toAdapterUser(user) : null
  },

  /**
   * We never persisted OAuth accounts (no Account table), so an account
   * lookup can never match - returning null tells next-auth to resolve
   * the user by email instead, which is exactly what the pre-adapter
   * signIn-callback flow did. Updating this comment? Update
   * allowDangerousEmailAccountLinking's comment in auth.ts too - the two
   * together preserve the historical access semantics.
   */
  async getUserByAccount() {
    return null
  },

  /**
   * Our User model has no `emailVerified` column, so the patch next-auth
   * sends (emailVerified stamp) is a no-op - but name/avatar updates are
   * applied when present. MUST return the (possibly unchanged) user:
   * next-auth uses the return value for the session JWT.
   */
  async updateUser({ id, name, image }) {
    const data: { name?: string; avatar?: string | null } = {}
    if (name !== undefined && name !== null) data.name = name
    if (image !== undefined) data.avatar = image
    const user = Object.keys(data).length
      ? await db.user.update({ where: { id }, data })
      : await db.user.findUnique({ where: { id } })
    if (!user) throw new Error(`updateUser: user ${id} not found`)
    return toAdapterUser(user)
  },

  async deleteUser(id) {
    await db.user.delete({ where: { id } })
  },

  /** No-op - we don't persist provider accounts (see getUserByAccount). */
  async linkAccount() {
    return undefined as never
  },

  // ---- Session-store methods: unreachable with strategy: "jwt". -------
  // Implemented as no-ops so the Adapter interface is satisfied.

  async createSession() {
    return null as never
  },
  async getSessionAndUser() {
    return null
  },
  async updateSession() {
    return null
  },
  async deleteSession() {
    return undefined as never
  },

  // ---- Email (magic link) verification tokens -------------------------

  /**
   * Persist a verification token. `token` arrives ALREADY HASHED by
   * next-auth (HMAC with the auth secret), so storing it is safe.
   * Opportunistically purges expired rows to keep the table tiny.
   */
  async createVerificationToken({ identifier, token, expires }) {
    // Fire-and-forget cleanup of stale tokens (single-instance ok; worst
    // case on serverless is a slightly bigger table - never an error).
    try {
      await db.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } })
    } catch {
      // ignore cleanup failures - never block the login email
    }
    await db.verificationToken.create({
      data: { identifier: identifier.toLowerCase(), token, expires },
    })
    return { identifier, token, expires }
  },

  /**
   * Single-use consume: delete the row and return it ATOMICALLY (Prisma's
   * delete returns the deleted record; a missing row throws P2025 → null).
   * Returning null - or a row whose `expires` has passed, which next-auth
   * checks itself - makes next-auth bounce the visitor to the "link no
   * longer valid" page instead of logging them in.
   */
  async useVerificationToken({ identifier, token }) {
    try {
      const row = await db.verificationToken.delete({
        where: {
          identifier_token: { identifier: identifier.toLowerCase(), token },
        },
      })
      return row as AdapterVerificationToken
    } catch {
      // P2025 (not found) or transient DB error - treat as invalid token
      return null
    }
  },
}
