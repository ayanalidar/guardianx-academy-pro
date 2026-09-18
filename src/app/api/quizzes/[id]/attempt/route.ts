import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { questions: true, lesson: { select: { module: { select: { courseId: true } } } } },
  })
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })

  // verify enrollment
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: quiz.lesson.module.courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 })

  const { answers } = await req.json() // { questionId: selectedIndex }

  let correct = 0
  const breakdown = quiz.questions.map((q) => {
    const selected = answers[q.id]
    const isCorrect = selected === q.answerIndex
    if (isCorrect) correct++
    return {
      questionId: q.id,
      text: q.text,
      options: q.options.split("|"),
      selected,
      correctIndex: q.answerIndex,
      isCorrect,
      explanation: q.explanation,
    }
  })
  const score = Math.round((correct / quiz.questions.length) * 100)
  const passed = score >= 70

  const attempt = await db.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      score,
      passed,
      answers: JSON.stringify(answers),
    },
  })

  let gamification: any = null
  if (passed) {
    const { awardXp } = await import("@/lib/gamification")
    gamification = await awardXp(user.id, "quiz_passed", 50, quiz.id)
    // notify on perfect score
    if (score === 100) {
      const { createNotification } = await import("@/lib/notifications")
      await createNotification({
        userId: user.id,
        type: "quiz_passed",
        title: "Perfect Quiz Score!",
        message: `You aced "${quiz.title}" with 100%. +50 XP earned.`,
        icon: "zap",
        color: "cyan",
        link: JSON.stringify({ name: "achievements" }),
      })
    }
  }

  return NextResponse.json({ attempt, score, passed, breakdown, gamification })
}
