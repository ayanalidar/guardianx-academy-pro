import { db } from "@/lib/db"

/**
 * logAction() - append a row to the AuditLog table.
 *
 * Used by admin mutation endpoints (course/user/coupon/instructor CRUD)
 * to keep a tamper-evident history of platform changes. The caller is
 * responsible for invoking this AFTER the mutation succeeds so the log
 * entry only records real changes.
 *
 * Failures here are swallowed (logged server-side) so they never break
 * the calling request - audit logging is best-effort, not transactional
 * with the business mutation.
 *
 * @param userId    the acting user's id (or null for system actions)
 * @param userName  the acting user's display name (denormalized for
 *                  readability even after the user is deleted)
 * @param action    dotted action name e.g. "course.create", "user.delete"
 * @param resource  the resource type e.g. "Course", "User", "Coupon"
 * @param resourceId the affected row id (optional)
 * @param details   a JSON-serializable object with before/after / payload
 */
export async function logAction(
  userId: string | null,
  userName: string,
  action: string,
  resource: string,
  resourceId?: string | null,
  details?: Record<string, unknown> | string,
): Promise<void> {
  try {
    const detailsStr =
      typeof details === "string"
        ? details
        : details
          ? JSON.stringify(details)
          : ""
    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        userName: userName || "",
        action,
        resource,
        resourceId: resourceId ?? "",
        details: detailsStr,
      },
    })
  } catch (err) {
    // Best-effort - never break the calling request.
    console.error("[audit] logAction failed:", err)
  }
}
