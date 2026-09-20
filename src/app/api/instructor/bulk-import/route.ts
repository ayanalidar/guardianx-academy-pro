import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/session"
import { sendEmail } from "@/lib/email"
import { parseCsvObjects, isValidEmail, generateTempPassword } from "@/lib/csv"

interface StudentInput {
  name: string
  email: string
  title?: string
}

const MAX_STUDENTS = 200

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
    if (user instanceof NextResponse) return user

    const body = await req.json()
    const courseId: string | undefined = body.courseId
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 })
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, shortName: true, instructorId: true },
    })
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

    // Instructors can only import into courses they own; admins can import anywhere.
    if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && course.instructorId !== user.id) {
      return NextResponse.json({ error: "Forbidden — you do not own this course" }, { status: 403 })
    }

    // Build students list from either array or CSV
    let students: StudentInput[] = []
    if (typeof body.csv === "string" && body.csv.trim().length > 0) {
      const rows = parseCsvObjects(body.csv)
      students = rows.map((r) => ({
        name: r.name || r.fullname || r["full name"] || "",
        email: r.email || r["e-mail"] || "",
        title: r.title || undefined,
      }))
    } else if (Array.isArray(body.students)) {
      students = body.students as StudentInput[]
    } else {
      return NextResponse.json(
        { error: "Provide either `students` array or `csv` string" },
        { status: 400 }
      )
    }

    if (students.length > MAX_STUDENTS) {
      return NextResponse.json(
        { error: `Cap of ${MAX_STUDENTS} students per request exceeded` },
        { status: 400 }
      )
    }

    let created = 0
    let enrolled = 0
    let skipped = 0
    const results: Array<{
      email: string
      status: string
      tempPassword?: string
      error?: string
    }> = []

    for (const s of students) {
      const name = (s.name || "").trim()
      const email = (s.email || "").trim().toLowerCase()
      const title = (s.title || "").trim() || undefined

      if (!name) {
        skipped++
        results.push({ email: email || "(empty)", status: "skipped", error: "Missing name" })
        continue
      }
      if (!isValidEmail(email)) {
        skipped++
        results.push({ email: email || "(invalid)", status: "skipped", error: "Invalid email" })
        continue
      }

      try {
        const existing = await db.user.findUnique({ where: { email } })
        let userId: string
        let tempPassword: string | undefined

        if (existing) {
          // Skip creation, but still try to enroll them.
          userId = existing.id
          results.push({ email, status: "exists" })
          skipped++
        } else {
          tempPassword = generateTempPassword()
          const newUser = await db.user.create({
            data: {
              name,
              email,
              passwordHash: bcrypt.hashSync(tempPassword, 10),
              role: "STUDENT",
              title: title ?? "Student",
            },
            select: { id: true },
          })
          userId = newUser.id
          created++
          results.push({ email, status: "created", tempPassword })
        }

        // Enroll if not already enrolled
        const existingEnrollment = await db.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        })
        if (!existingEnrollment) {
          await db.enrollment.create({
            data: { userId, courseId, lastAccessed: new Date() },
          })
          await db.course.update({
            where: { id: courseId },
            data: { studentsCount: { increment: 1 } },
          })
          enrolled++
        }

        // Send appropriate email
        if (tempPassword) {
          // Welcome email with temp credentials (newly created user)
          await sendEmail({
            to: email,
            subject: `Welcome to GuardianX Academy — ${course.title}`,
            body: `Hi ${name},\n\nYou've been enrolled in "${course.title}" (${course.shortName}) on GuardianX Academy by your instructor.\n\nYour temporary login credentials:\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in at GuardianX Academy and change your password after your first sign-in.\n\nWelcome aboard!\nThe GuardianX Team`,
            type: "welcome",
            userId,
          })
        } else if (!existingEnrollment) {
          // Existing user, newly enrolled in this course
          await sendEmail({
            to: email,
            subject: `Enrolled — ${course.title}`,
            body: `Hi ${name},\n\nYou've been enrolled in "${course.title}" (${course.shortName}) on GuardianX Academy. Log in to start learning.\n\nThe GuardianX Team`,
            type: "notification",
            userId,
          })
        }
      } catch (err) {
        console.error("[bulk-import] row error:", email, err)
        skipped++
        results.push({ email, status: "error", error: "Failed to process row" })
      }
    }

    return NextResponse.json({ created, enrolled, skipped, results })
  } catch (e) {
    console.error("[bulk-import]", e)
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 })
  }
}
