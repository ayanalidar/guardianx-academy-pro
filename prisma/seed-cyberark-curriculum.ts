// Seed the CyberArk IAM & PAM course curriculum — run with:
//   DATABASE_URL="postgresql://..." npx tsx prisma/seed-cyberark-curriculum.ts
// (or: bun run prisma/seed-cyberark-curriculum.ts)
//
// Replaces the course's skeleton modules with the authored 8-module
// syllabus + 4-phase GXA-210 lab track (GXA course id
// cmtg4favo0057mko8ymxbinkx).
//
// The seed content itself lives in src/lib/cyberark-curriculum-seed.ts
// so the same data can be applied through a deploy-time API route when
// the production database is not reachable from the shell.
//
// Idempotency: refuses to run if the new curriculum is already present
// (module count >= seed count, or a "Module 08"/"Lab Phase 4" module
// exists). Lesson deletes cascade to LessonProgress / Note / Quiz /
// Question / QuizAttempt per schema.prisma.

import { PrismaClient } from "@prisma/client"
import {
  CYBERARK_CURRICULUM,
  CYBERARK_COURSE_ID,
  CYBERARK_COURSE_SLUG,
} from "../src/lib/cyberark-curriculum-seed"

const db = new PrismaClient()

async function main() {
  const course = await db.course.findUnique({
    where: { id: CYBERARK_COURSE_ID },
    include: { modules: { include: { lessons: { select: { id: true } } } } },
  })
  if (!course || course.slug !== CYBERARK_COURSE_SLUG) {
    throw new Error(
      `CyberArk course ${CYBERARK_COURSE_ID} (${CYBERARK_COURSE_SLUG}) not found`
    )
  }

  const existingLessonIds = course.modules.flatMap((m) =>
    m.lessons.map((l) => l.id)
  )
  const alreadySeeded =
    course.modules.length >= CYBERARK_CURRICULUM.length ||
    course.modules.some(
      (m) =>
        m.title.startsWith("Module 08") || m.title.startsWith("Lab Phase 4")
    )
  if (alreadySeeded) {
    console.log(
      `Already seeded (${course.modules.length} modules present) - nothing to do.`
    )
    return
  }

  console.log(
    `Replacing ${course.modules.length} modules / ${existingLessonIds.length} lessons on "${course.title}" ...`
  )

  const lessonsCreated = CYBERARK_CURRICULUM.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  )

  await db.$transaction(async (tx) => {
    await tx.module.deleteMany({ where: { courseId: CYBERARK_COURSE_ID } })
    for (let i = 0; i < CYBERARK_CURRICULUM.length; i++) {
      const m = CYBERARK_CURRICULUM[i]
      await tx.module.create({
        data: {
          courseId: CYBERARK_COURSE_ID,
          title: m.title,
          description: m.description,
          order: i,
          lessons: {
            create: m.lessons.map((l, li) => ({
              title: l.title,
              type: l.type,
              content: l.content,
              durationMin: l.durationMin,
              order: li,
              preview: l.preview ?? false,
            })),
          },
        },
      })
    }
    await tx.course.update({
      where: { id: CYBERARK_COURSE_ID },
      data: { updatedAt: new Date() },
    })
  })

  console.log(
    `Seeded ${CYBERARK_CURRICULUM.length} modules / ${lessonsCreated} lessons.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
