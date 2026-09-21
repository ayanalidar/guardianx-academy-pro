import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export const runtime = "nodejs"

// ============================================================
// Resume Builder
// GET:  user's resume (creates empty default if none)
// POST: create / update resume. Supports ?autopopulate=true to
//       auto-fill certifications, courses, and labs from the
//       user's GuardianX activity.
// ============================================================

interface ExperienceItem {
  title: string
  company: string
  startDate: string
  endDate: string
  description: string
}
interface EducationItem {
  degree: string
  institution: string
  startDate: string
  endDate: string
}
interface ProjectItem {
  title: string
  description: string
  link?: string
}
interface ContactInfo {
  email?: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
}

async function buildAutopopulate(userId: string, user: any) {
  const [certs, enrollments, labProgress] = await Promise.all([
    db.certificate.findMany({
      where: { userId },
      include: { course: { select: { title: true, shortName: true, certBody: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    db.enrollment.findMany({
      where: { userId, completed: true },
      include: { course: { select: { id: true, title: true, shortName: true, category: true } } },
      orderBy: { enrolledAt: "desc" },
    }),
    db.labProgress.findMany({
      where: { userId, status: "completed" },
      include: { lab: { select: { id: true, title: true, category: true, difficulty: true } } },
      orderBy: { completedAt: "desc" },
    }),
  ])

  const certifications = certs.map((c) => ({
    title: c.course.certBody ? `${c.course.shortName} - ${c.course.certBody}` : c.course.shortName,
    issuer: c.course.certBody || "GuardianX Academy",
    date: new Date(c.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" }),
    verificationId: c.certificateId,
  }))

  const courses = enrollments.map((e) => ({
    title: e.course.title,
    shortName: e.course.shortName,
    category: e.course.category,
    completedAt: e.lastAccessed
      ? new Date(e.lastAccessed).toLocaleDateString("en-US", { year: "numeric", month: "short" })
      : "",
  }))

  const labs = labProgress.map((l) => ({
    title: l.lab.title,
    category: l.lab.category,
    difficulty: l.lab.difficulty,
    completedAt: l.completedAt
      ? new Date(l.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })
      : "",
  }))

  const skills = Array.from(
    new Set([
      ...courses.map((c) => c.category).filter(Boolean),
      ...labs.map((l) => l.category).filter(Boolean),
    ])
  )

  return {
    certifications,
    guardianCourses: courses,
    guardianLabs: labs,
    skills: skills.length > 0 ? skills : ["Network Security", "Web Security", "Linux"],
    summary:
      user?.title ||
      `Cybersecurity professional with ${courses.length} completed GuardianX certifications and ${labs.length} hands-on labs. Proficient in ${skills.slice(0, 3).join(", ")}.`,
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let resume = await db.resume.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    })

    if (!resume) {
      // Create a default empty resume
      resume = await db.resume.create({
        data: {
          userId: user.id,
          template: "cybersecurity",
          summary: user.bio || user.title || "",
          contactInfo: JSON.stringify({
            email: user.email || "",
            name: user.name || "",
            title: user.title || "",
          } as ContactInfo),
        },
      })
    }

    return NextResponse.json({
      resume: {
        ...resume,
        experience: JSON.parse(resume.experience || "[]"),
        education: JSON.parse(resume.education || "[]"),
        skills: JSON.parse(resume.skills || "[]"),
        certifications: JSON.parse(resume.certifications || "[]"),
        projects: JSON.parse(resume.projects || "[]"),
        contactInfo: JSON.parse(resume.contactInfo || "{}"),
      },
    })
  } catch (err: any) {
    console.error("[resume] GET error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const autopopulate = searchParams.get("autopopulate") === "true"

    const body = await req.json().catch(() => ({}))
    const {
      template,
      summary,
      experience,
      education,
      skills,
      projects,
      contactInfo,
      isPublic,
    } = body as {
      template?: string
      summary?: string
      experience?: ExperienceItem[]
      education?: EducationItem[]
      skills?: string[]
      projects?: ProjectItem[]
      contactInfo?: ContactInfo
      isPublic?: boolean
    }

    // Get existing or none
    const existing = await db.resume.findFirst({
      where: { userId: user.id },
    })

    // If autopopulate, gather GuardianX data and merge
    let finalCerts: any[] = []
    let finalSkills: string[] = skills || []
    let finalSummary = summary || ""

    if (autopopulate) {
      const auto = await buildAutopopulate(user.id, user)
      finalCerts = auto.certifications
      finalSkills = Array.from(new Set([...(skills || []), ...auto.skills]))
      if (!finalSummary) finalSummary = auto.summary
    } else if (existing) {
      try {
        finalCerts = JSON.parse(existing.certifications || "[]")
      } catch {
        finalCerts = []
      }
    }

    const data = {
      template: template || existing?.template || "cybersecurity",
      summary: finalSummary || existing?.summary || "",
      experience: JSON.stringify(experience || (existing ? JSON.parse(existing.experience || "[]") : [])),
      education: JSON.stringify(education || (existing ? JSON.parse(existing.education || "[]") : [])),
      skills: JSON.stringify(finalSkills),
      certifications: JSON.stringify(finalCerts),
      projects: JSON.stringify(projects || (existing ? JSON.parse(existing.projects || "[]") : [])),
      contactInfo: JSON.stringify(
        contactInfo ||
          (existing ? JSON.parse(existing.contactInfo || "{}") : { email: user.email, name: user.name })
      ),
      isPublic: isPublic ?? existing?.isPublic ?? false,
    }

    let resume
    if (existing) {
      resume = await db.resume.update({
        where: { id: existing.id },
        data,
      })
    } else {
      resume = await db.resume.create({
        data: { userId: user.id, ...data },
      })
    }

    return NextResponse.json({
      resume: {
        ...resume,
        experience: JSON.parse(resume.experience || "[]"),
        education: JSON.parse(resume.education || "[]"),
        skills: JSON.parse(resume.skills || "[]"),
        certifications: JSON.parse(resume.certifications || "[]"),
        projects: JSON.parse(resume.projects || "[]"),
        contactInfo: JSON.parse(resume.contactInfo || "{}"),
      },
    })
  } catch (err: any) {
    console.error("[resume] POST error:", err?.message)
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
