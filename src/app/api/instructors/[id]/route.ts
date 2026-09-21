import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"

// GET /api/instructors/[id] - public. Returns a single instructor's full profile
// + assigned courses + assigned training batches.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const user = await db.user.findFirst({
      where: { id, role: "INSTRUCTOR" },
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
            phone: true,
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
            _count: { select: { enrollments: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Instructor not found", instructor: null },
        { status: 404 },
      )
    }

    // Assigned training batches (matched by instructorId).
    const batches = await db.trainingBatch.findMany({
      where: { instructorId: user.id },
      select: {
        id: true,
        name: true,
        certification: true,
        schedule: true,
        startDate: true,
        mode: true,
        seats: true,
        enrolled: true,
        status: true,
        level: true,
      },
      orderBy: { startDate: "asc" },
    })

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

    const publishedCourses = user.taughtCourses.filter((c) => c.published)
    const totalLearners = publishedCourses.reduce(
      (acc, c) => acc + c._count.enrollments,
      0,
    )

    const instructor = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      title: user.title,
      bio: user.bio,
      email: user.email,
      phone: user.instructorProfile?.phone ?? null,
      expertise: safeParse<string[]>(user.instructorProfile?.expertise, []),
      yearsExperience: user.instructorProfile?.yearsExperience ?? 0,
      certifications: safeParse<string[]>(user.instructorProfile?.certifications, []),
      linkedinUrl: user.instructorProfile?.linkedinUrl ?? null,
      maxBatches: user.instructorProfile?.maxBatches ?? 0,
      stats: {
        coursesCount: publishedCourses.length,
        batchesCount: batches.length,
        learnersCount: totalLearners,
        yearsExperience: user.instructorProfile?.yearsExperience ?? 0,
      },
      courses: publishedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        level: c.level,
        durationHours: c.durationHours,
        category: c.category,
        enrolledCount: c._count.enrollments,
      })),
      batches: batches.map((b) => ({
        id: b.id,
        name: b.name,
        certification: b.certification,
        schedule: b.schedule,
        startDate: b.startDate,
        mode: b.mode,
        seats: b.seats,
        enrolled: b.enrolled,
        status: b.status,
        level: b.level,
      })),
      createdAt: user.createdAt,
    }

    return NextResponse.json({ instructor })
  } catch (err) {
    console.error(`[api/instructors/${id}] GET failed:`, err)
    return NextResponse.json(
      { error: "Failed to load instructor", instructor: null },
      { status: 500 },
    )
  }
}
