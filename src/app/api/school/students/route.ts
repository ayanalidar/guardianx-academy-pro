import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"

function generateTempPassword(len = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/** Guard helper for school-admin access. */
async function schoolAdminGuard() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (user.role !== "SCHOOL_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden - SCHOOL_ADMIN only" }, { status: 403 }) }
  }
  if (!user.schoolId) {
    return { error: NextResponse.json({ error: "No school linked to this account" }, { status: 403 }) }
  }
  return { user, schoolId: user.schoolId }
}

export async function GET(req: NextRequest) {
  const guard = await schoolAdminGuard()
  if ("error" in guard) return guard.error
  const { schoolId } = guard

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()
  const batchId = url.searchParams.get("batchId") || undefined
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 50)

  // If batchId filter is set, get the batch's members first (must belong to school)
  let filteredUserIds: string[] | null = null
  if (batchId) {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: { id: true, schoolId: true, members: { select: { userId: true } } },
    })
    if (!batch || batch.schoolId !== schoolId) {
      return NextResponse.json({ error: "Batch not found in this school" }, { status: 404 })
    }
    filteredUserIds = batch.members.map((m) => m.userId)
  }

  // Fetch student members of the school with their user + batch memberships
  const members = await db.schoolMember.findMany({
    where: {
      schoolId,
      role: "STUDENT",
      ...(filteredUserIds ? { userId: { in: filteredUserIds } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          title: true,
          xp: true,
          level: true,
          streak: true,
          createdAt: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    take: limit,
  })

  // Apply name/email search in memory (small enough set)
  let filtered = members
  if (q) {
    filtered = members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        (m.user.title || "").toLowerCase().includes(q)
    )
  }

  // Fetch batch memberships for these users (only batches within this school)
  const userIds = filtered.map((m) => m.userId)
  const batchMembers = userIds.length
    ? await db.batchMember.findMany({
        where: { userId: { in: userIds }, batch: { schoolId } },
        include: { batch: { select: { id: true, name: true, status: true } } },
      })
    : []

  const batchMap = new Map<string, { id: string; name: string; status: string }[]>()
  for (const bm of batchMembers) {
    const arr = batchMap.get(bm.userId) || []
    arr.push({ id: bm.batch.id, name: bm.batch.name, status: bm.batch.status })
    batchMap.set(bm.userId, arr)
  }

  // Enrollment count = number of Enrollment records for the user
  const enrollments = userIds.length
    ? await db.enrollment.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      })
    : []
  const enrollMap = new Map<string, number>()
  for (const e of enrollments) enrollMap.set(e.userId, e._count._all)

  const students = filtered.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatar,
    title: m.user.title,
    xp: m.user.xp,
    level: m.user.level,
    streak: m.user.streak,
    createdAt: m.user.createdAt,
    joinedAt: m.joinedAt,
    batches: batchMap.get(m.user.id) || [],
    enrollmentCount: enrollMap.get(m.user.id) || 0,
  }))

  return NextResponse.json({
    students,
    count: students.length,
    filtered: !!q || !!batchId,
  })
}

export async function POST(req: NextRequest) {
  try {
    const guard = await schoolAdminGuard()
    if ("error" in guard) return guard.error
    const { schoolId } = guard

    const body = await req.json()
    const name: string = (body.name || "").toString().trim()
    const email: string = (body.email || "").toString().trim().toLowerCase()
    const password: string | undefined = body.password
    const batchId: string | undefined = body.batchId
    const title: string | undefined = body.title

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Valid name is required" }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Verify batchId belongs to school if provided
    if (batchId) {
      const batch = await db.batch.findUnique({
        where: { id: batchId },
        select: { id: true, schoolId: true, name: true },
      })
      if (!batch || batch.schoolId !== schoolId) {
        return NextResponse.json({ error: "Batch not found in this school" }, { status: 404 })
      }
    }

    // Find or create the user
    const existingUser = await db.user.findUnique({ where: { email } })
    let userId: string
    let userName: string
    let userEmail: string
    let userTitle: string | null
    let userRole: string
    let tempPassword: string | undefined
    let created = false

    if (!existingUser) {
      tempPassword = password && password.length >= 6 ? password : generateTempPassword()
      const newUser = await db.user.create({
        data: {
          name,
          email,
          passwordHash: bcrypt.hashSync(tempPassword, 10),
          role: "STUDENT",
          title: title || "Student",
          schoolId,
        },
        select: { id: true, name: true, email: true, role: true, title: true },
      })
      userId = newUser.id
      userName = newUser.name
      userEmail = newUser.email
      userTitle = newUser.title
      userRole = newUser.role
      created = true
    } else {
      // ensure role + schoolId are set
      if (existingUser.role !== "STUDENT" && existingUser.role !== "SCHOOL_ADMIN") {
        return NextResponse.json(
          { error: `User already exists with role ${existingUser.role} - cannot add as student` },
          { status: 400 }
        )
      }
      if (existingUser.schoolId && existingUser.schoolId !== schoolId) {
        return NextResponse.json(
          { error: "User is already a member of another school" },
          { status: 400 }
        )
      }
      if (!existingUser.schoolId) {
        const updated = await db.user.update({
          where: { id: existingUser.id },
          data: { schoolId, role: existingUser.role === "STUDENT" ? "STUDENT" : existingUser.role },
          select: { id: true, name: true, email: true, role: true, title: true },
        })
        userId = updated.id
        userName = updated.name
        userEmail = updated.email
        userTitle = updated.title
        userRole = updated.role
      } else {
        userId = existingUser.id
        userName = existingUser.name
        userEmail = existingUser.email
        userTitle = existingUser.title
        userRole = existingUser.role
      }
    }

    // Link to school (idempotent)
    const existingMember = await db.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    })
    if (!existingMember) {
      await db.schoolMember.create({
        data: { schoolId, userId, role: "STUDENT" },
      })
    }

    // Add to batch if provided (idempotent)
    if (batchId) {
      const existingBatchMember = await db.batchMember.findUnique({
        where: { batchId_userId: { batchId, userId } },
      })
      if (!existingBatchMember) {
        await db.batchMember.create({ data: { batchId, userId } })
      }
    }

    // Send welcome email
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, schoolCode: true },
    })
    if (school) {
      if (created && tempPassword) {
        await sendEmail({
          to: email,
          subject: `Welcome to ${school.name} - GuardianX Academy`,
          body: `Hi ${name},\n\nYou've been added as a student at ${school.name} (code: ${school.schoolCode}) on GuardianX Academy.\n\nYour temporary login credentials:\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and change your password after your first sign-in.\n\nWelcome aboard!\nThe GuardianX Team`,
          type: "welcome",
          userId,
        })
      } else {
        await sendEmail({
          to: email,
          subject: `Added to ${school.name} - GuardianX Academy`,
          body: `Hi ${name},\n\nYou've been added as a student at ${school.name} (code: ${school.schoolCode}) on GuardianX Academy. Log in with your existing credentials to continue.\n\nThe GuardianX Team`,
          type: "notification",
          userId,
        })
      }
    }

    return NextResponse.json({
      student: {
        id: userId,
        name: userName,
        email: userEmail,
        title: userTitle,
        role: userRole,
        created,
        addedToBatch: !!batchId,
      },
      tempPassword: created ? tempPassword : undefined,
    })
  } catch (e) {
    console.error("[school/students POST]", e)
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 })
  }
}
