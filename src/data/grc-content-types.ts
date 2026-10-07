// Shared types for GRC course content sync.
// Source of truth: the official curriculum PDFs supplied by the program owner
// (GRC MASTERY COURSE — Complete Curriculum & Module Guide; IT GRC PROFESSIONAL —
// Complete Course Structure). Every module, topic group, subtopic bullet,
// practical and project in those PDFs is represented here.

export interface SyncLesson {
  title: string
  type?: "reading" | "pdf" | "video" | "lab"
  durationMin?: number
  preview?: boolean
  content: string
}

export interface SyncModule {
  title: string
  description?: string
  lessons: SyncLesson[]
}

export interface SyncCourseContent {
  slug: string
  /** Guard: the prod course id this content belongs to (abort if slug points elsewhere). */
  courseId: string
  fields: {
    description: string
    longDescription: string
    tags: string
    whatYouWillLearn: string[]
    whoShouldAttend: string[]
    toolsCovered: string[]
    careerOutcomes: string[]
  }
  modules: SyncModule[]
}
