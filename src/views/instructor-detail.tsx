"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Calendar,
  Users, Briefcase, GraduationCap, Mail, ShieldCheck, Clock,
  MapPin, Layers, Sparkles,
} from "lucide-react"

/* ============================================================
   /instructor/<id> - public instructor profile (master-prompt §25)
   ============================================================ */

interface AssignedCourse {
  id: string
  title: string
  slug: string
  level: string
  durationHours: number
  category: string
  enrolledCount: number
}

interface AssignedBatch {
  id: string
  name: string
  certification: string
  schedule: string
  startDate: string
  mode: string
  seats: number
  enrolled: number
  status: string
  level: string
}

interface InstructorDetail {
  id: string
  name: string
  avatar: string | null
  title: string | null
  bio: string | null
  email: string
  phone: string | null
  expertise: string[]
  yearsExperience: number
  certifications: string[]
  maxBatches: number
  stats: {
    coursesCount: number
    batchesCount: number
    learnersCount: number
    yearsExperience: number
  }
  courses: AssignedCourse[]
  batches: AssignedBatch[]
  createdAt: string
}

function initials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function InstructorDetailView() {
  const { view, navigate } = useAppStore()
  const instructorId = view.name === "instructor-detail" ? view.instructorId : ""

  const { data, isLoading, isError } = useQuery<{ instructor: InstructorDetail | null }>({
    queryKey: ["public-instructor", instructorId],
    queryFn: async () => {
      const res = await fetch(`/api/instructors/${encodeURIComponent(instructorId)}`)
      if (!res.ok) return { instructor: null }
      return res.json()
    },
    enabled: !!instructorId,
    staleTime: 60_000,
  })

  const instructor = data?.instructor ?? null

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* Back nav */}
      <section className="relative pt-4 pb-2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ name: "instructors" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            All instructors
          </Button>
        </div>
      </section>

      {/* HERO */}
      <section className="relative py-6 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card animate-pulse h-80" />
          ) : isError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center">
              <p className="text-sm text-rose-300">Failed to load instructor profile.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate({ name: "instructors" })}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to all instructors
              </Button>
            </div>
          ) : !instructor ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
              <ShieldCheck className="h-10 w-10 text-amber-300/60 mx-auto mb-4" />
              <p className="text-base font-semibold mb-1">Instructor not found.</p>
              <p className="text-sm text-muted-foreground mb-5">
                This instructor may have been removed or the link is incorrect.
              </p>
              <Button size="sm" onClick={() => navigate({ name: "instructors" })} className="bg-violet-600 hover:bg-violet-500">
                See all instructors <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Left: avatar + name + meta */}
              <div className="lg:col-span-1">
                <div className="card-premium rounded-2xl p-6 text-center lg:sticky lg:top-24">
                  {instructor.avatar ? (
                    <img
                      src={instructor.avatar}
                      alt={instructor.name}
                      className="h-28 w-28 rounded-2xl object-cover mx-auto mb-4 ring-2 ring-violet-500/30"
                      draggable={false}
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 bg-violet-500/10 text-violet-300 ring-2 ring-violet-500/30">
                      {initials(instructor.name)}
                    </div>
                  )}
                  <h1 className="text-2xl font-bold tracking-tight mb-1">{instructor.name}</h1>
                  {instructor.title && (
                    <p className="text-sm text-muted-foreground mb-4 leading-snug">{instructor.title}</p>
                  )}

                  {/* Inline meta */}
                  <div className="flex flex-col gap-2 mb-5 text-xs text-muted-foreground">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{instructor.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => navigate({ name: "contact" })}
                      className="bg-violet-600 hover:bg-violet-500 btn-premium w-full"
                    >
                      Book a session
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate({ name: "contact" })}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-1.5" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: bio + expertise + stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bio */}
                {instructor.bio && (
                  <div className="card-premium rounded-2xl p-6">
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-3">ABOUT</p>
                    <p className="text-base text-foreground/90 leading-relaxed">{instructor.bio}</p>
                  </div>
                )}

                {/* Stats strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={Briefcase} value={`${instructor.stats.yearsExperience}+`} label="Years experience" tint="text-violet-300" tintBg="bg-violet-500/10" />
                  <StatCard icon={BookOpen} value={instructor.stats.coursesCount} label="Courses taught" tint="text-cyan-300" tintBg="bg-cyan-500/10" />
                  <StatCard icon={Calendar} value={instructor.stats.batchesCount} label="Active batches" tint="text-amber-300" tintBg="bg-amber-500/10" />
                  <StatCard icon={GraduationCap} value={instructor.stats.learnersCount} label="Learners reached" tint="text-emerald-300" tintBg="bg-emerald-500/10" />
                </div>

                {/* Expertise */}
                {instructor.expertise.length > 0 && (
                  <div className="card-premium rounded-2xl p-6">
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-4">EXPERTISE</p>
                    <div className="flex flex-wrap gap-2">
                      {instructor.expertise.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-mono px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {instructor.certifications.length > 0 && (
                  <div className="card-premium rounded-2xl p-6">
                    <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-4">CERTIFICATIONS</p>
                    <div className="flex flex-wrap gap-2">
                      {instructor.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        >
                          <Award className="h-3.5 w-3.5" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Assigned courses */}
      {instructor && instructor.courses.length > 0 && (
        <section className="relative py-8 lg:py-10 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-1">COURSES</p>
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Assigned courses</h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {instructor.courses.length} course{instructor.courses.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructor.courses.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  onClick={() => navigate({ name: "course", courseId: c.id })}
                  className="card-premium rounded-xl p-5 text-left group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex p-2.5 rounded-lg bg-violet-500/10 text-violet-300">
                      <BookOpen className="h-4.5 w-4.5" />
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono">{c.level}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-violet-300 transition-colors">
                    {c.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {c.durationHours}h
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {c.enrolledCount}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground/80 font-mono uppercase tracking-wider">
                    {c.category}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Assigned batches */}
      {instructor && instructor.batches.length > 0 && (
        <section className="relative py-8 lg:py-10 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-mono text-amber-400 tracking-[0.25em] mb-1">BATCHES</p>
                <h2 className="text-xl lg:text-2xl font-bold tracking-tight">Assigned batches</h2>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {instructor.batches.length} batch{instructor.batches.length === 1 ? "" : "es"}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructor.batches.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="card-premium rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex p-2.5 rounded-lg bg-amber-500/10 text-amber-300">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-mono",
                        b.status === "Open" && "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
                        b.status === "Almost Full" && "text-amber-300 border-amber-500/30 bg-amber-500/5",
                        b.status === "Full" && "text-rose-300 border-rose-500/30 bg-rose-500/5",
                        b.status === "Completed" && "text-muted-foreground",
                      )}
                    >
                      {b.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-1">{b.certification}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{b.name}</p>
                  <div className="space-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>{b.startDate || "TBD"}</span>
                    </div>
                    {b.schedule && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span className="truncate">{b.schedule}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>{b.mode}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span>{b.enrolled} / {b.seats} enrolled</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty assigned (no courses + no batches) */}
      {instructor && instructor.courses.length === 0 && instructor.batches.length === 0 && (
        <section className="relative py-8 lg:py-10 border-t border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {instructor.name} is not currently teaching any public courses or batches. Reach out via the
                Contact button to enquire about scheduling a 1:1 session.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {instructor && (
        <section className="relative py-10 lg:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center"
            >
              <Sparkles className="h-7 w-7 text-violet-300 mx-auto mb-3" />
              <h3 className="text-xl font-semibold mb-2">Work directly with {instructor.name.split(" ")[0]}.</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                Book a 1:1 mentorship session, an audit engagement, or a corporate training delivery.
              </p>
              <Button onClick={() => navigate({ name: "contact" })} className="bg-violet-600 hover:bg-violet-500 btn-premium">
                Book a session <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, value, label, tint, tintBg }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string; tint: string; tintBg: string }) {
  return (
    <div className="card-premium rounded-xl p-4 text-center">
      <div className={cn("inline-flex p-2 rounded-lg mb-2", tintBg, tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-mono text-xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}
