import type { MetadataRoute } from "next"
import { db } from "@/lib/db"

const BASE_URL = "https://academy.guardianx.cloud"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/courses`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/batches`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/instructors`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/events`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/learning-paths`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/cyber-range`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/verify`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/institutions/schools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/institutions/colleges`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/institutions/universities`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/institutions/open-schooling`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/corporate-training`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/cyber-quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ]

  try {
    const [courses, blogPosts, events, instructors, batches] = await Promise.all([
      db.course.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
      db.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
      db.event.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
      db.user.findMany({ where: { role: "INSTRUCTOR" }, select: { id: true, updatedAt: true } }).catch(() => []),
      db.trainingBatch.findMany({ where: { published: true }, select: { id: true, updatedAt: true } }).catch(() => []),
    ])

    for (const c of courses) {
      entries.push({ url: `${BASE_URL}/courses/${encodeURIComponent(c.slug)}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })
    }
    for (const b of batches) {
      entries.push({ url: `${BASE_URL}/batches/${encodeURIComponent(b.id)}`, lastModified: b.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })
    }
    for (const b of blogPosts) {
      entries.push({ url: `${BASE_URL}/blog/${encodeURIComponent(b.slug)}`, lastModified: b.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })
    }
    for (const e of events) {
      entries.push({ url: `${BASE_URL}/events/${encodeURIComponent(e.slug)}`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })
    }
    for (const i of instructors) {
      entries.push({ url: `${BASE_URL}/instructors/${encodeURIComponent(i.id)}`, lastModified: i.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })
    }
  } catch (e) {
    // DB failed — still return static routes
  }

  return entries
}
