import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cachedJson } from "@/lib/http-cache"

export const runtime = "nodejs"

// GET /api/instructors — public. Returns all instructors (role=INSTRUCTOR) with
// their InstructorProfile (expertise, yearsExperience, certifications, linkedinUrl)
// plus counts of assigned courses + assigned training batches.
export async function GET() {
  try {
    const instructors = await db.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        title: true,
        bio: true,
        createdAt: true,
        instructorProfile: {
          select: {
            expertise: true,
            yearsExperience: true,
            certifications: true,
            linkedinUrl: true,
            maxBatches: true,
            currentBatches: true,
          },
        },
        taughtCourses: {
          select: {
            id: true,
            title: true,
            slug: true,
            level: true,
            durationHours: true,
            category: true,
            published: true,
          },
        },
        _count: { select: { taughtCourses: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Count assigned training batches per instructor (matched by instructorId).
    const instructorIds = instructors.map((i) => i.id)
    const batchCounts = await db.trainingBatch.groupBy({
      by: ["instructorId"],
      where: { instructorId: { in: instructorIds } },
      _count: { id: true },
    })
    const batchCountMap = new Map(
      batchCounts
        .filter((b) => b.instructorId !== null)
        .map((b) => [b.instructorId as string, b._count.id]),
    )

    // Total learners across all the instructor's courses.
    const enrollments = await db.enrollment.groupBy({
      by: ["courseId"],
      where: { course: { instructorId: { in: instructorIds } } },
      _count: { id: true },
    })
    const courseIdToEnrollments = new Map(enrollments.map((e) => [e.courseId, e._count.id]))

    const safeParse = <T,>(raw: string | null | undefined, fallback: T): T => {
      if (!raw) return fallback
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) || typeof parsed === "object"
          ? (parsed as T)
          : fallback
      } catch {
        return fallback
      }
    }

    const result = instructors.map((u) => {
      const publishedCourses = u.taughtCourses.filter((c) => c.published)
      const learnersTotal = u.taughtCourses.reduce(
        (acc, c) => acc + (courseIdToEnrollments.get(c.id) ?? 0),
        0,
      )
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        title: u.title,
        bio: u.bio,
        expertise: safeParse<string[]>(u.instructorProfile?.expertise, []),
        yearsExperience: u.instructorProfile?.yearsExperience ?? 0,
        certifications: safeParse<string[]>(u.instructorProfile?.certifications, []),
        linkedinUrl: u.instructorProfile?.linkedinUrl ?? null,
        maxBatches: u.instructorProfile?.maxBatches ?? 0,
        coursesCount: publishedCourses.length,
        courses: publishedCourses.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          level: c.level,
          durationHours: c.durationHours,
          category: c.category,
        })),
        batchesCount: batchCountMap.get(u.id) ?? 0,
        learnersCount: learnersTotal,
        createdAt: u.createdAt,
      }
    })

    return cachedJson({ instructors: result, count: result.length }, { sMax: 120, swr: 600 })
  } catch (err) {
    console.error("[api/instructors] GET failed:", err)
    return NextResponse.json(
      { error: "Failed to load instructors", instructors: [], count: 0 },
      { status: 500 },
    )
  }
}
