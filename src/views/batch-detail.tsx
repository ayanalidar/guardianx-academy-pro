"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Calendar, Clock, Users, Video, MapPin, User, ArrowRight, ArrowLeft,
  AlertCircle, Copy, MessageCircle, Linkedin, GraduationCap, ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

interface BatchData {
  id: string; slug: string; certification: string; name: string; schedule: string
  startDate: string; startIsoDate: string | null; mode: string; instructor: string
  seats: number; enrolled: number; level: string; status: string; description: string
  certColor: string; certTint: string; certBorder: string; levelColor: string
  levelTint: string; levelBorder: string; googleFormUrl: string | null; featured: boolean
}

/**
 * BatchDetailView - renders a training batch's details for `/batches/<slug>`.
 *
 * Used in two spaces:
 *   1. The real Next.js page `src/app/batches/[slug]/page.tsx` via
 *      PublicRouteView (server-renderable initial paint + store hydration).
 *   2. The SPA ViewRouter as the `batch-detail` store view, so navigating
 *      from anywhere in the platform works without a full reload.
 *
 * The internal navigate() calls (All batches / Browse courses / Contact)
 * are store-driven - they work because the page follows the store
 * reactively (PublicRouteView), fixing the old "URL changes but the
 * screen stays" dead-end on batch detail pages.
 */
export function BatchDetailView({ slug }: { slug: string }) {
  const { navigate } = useAppStore()

  const { data, isLoading, error } = useQuery<{ batch: BatchData }>({
    queryKey: ["batch-detail", slug],
    queryFn: async () => {
      const res = await fetch(`/api/training-batches/${slug}`)
      if (!res.ok) throw new Error("Batch not found")
      return res.json()
    },
    enabled: !!slug,
    retry: 1,
  })

  const batch = data?.batch

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-3/4 mb-6" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Batch not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This batch may have been removed or is no longer available.</p>
        <Button onClick={() => navigate({ name: "batches" })} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> View all batches
        </Button>
      </div>
    )
  }

  const seatsLeft = Math.max(0, batch.seats - batch.enrolled)
  const fillPct = batch.seats > 0 ? Math.round((batch.enrolled / batch.seats) * 100) : 0
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/batches/${batch.slug}` : ""

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link copied!")
  }
  const shareWhatsApp = () => {
    const text = `Check out this batch: ${batch.name} (${batch.certification}) at GuardianX Academy. Starts ${batch.startDate}. ${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }
  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: "batches" })} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> All batches
        </Button>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge className={cn("text-xs text-white border-0", batch.certTint, batch.certColor)}>{batch.certification}</Badge>
            <Badge variant="outline" className={cn("text-[10px]", batch.levelTint, batch.levelColor, batch.levelBorder)}>{batch.level}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {batch.mode === "Live Online" ? <Video className="h-2.5 w-2.5 mr-1" /> : <MapPin className="h-2.5 w-2.5 mr-1" />}
              {batch.mode}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", batch.status === "Open" ? "text-emerald-300 border-emerald-500/30" : "text-amber-300 border-amber-500/30")}>{batch.status}</Badge>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-balance">{batch.name}</h1>
          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground mb-6">
            {batch.startDate && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Starts {batch.startDate}</span>}
            {batch.instructor && <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {batch.instructor}</span>}
            {batch.schedule && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {batch.schedule}</span>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-xl border border-border/60 bg-card/40 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">SEATS</span>
            <span className={cn("text-xs font-mono tabular-nums", seatsLeft <= 2 ? "text-amber-300" : "text-emerald-300")}>{seatsLeft} left · {batch.enrolled}/{batch.seats} filled</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", fillPct >= 90 ? "bg-rose-400" : fillPct >= 70 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${fillPct}%` }} />
          </div>
        </motion.div>

        {batch.description && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mb-6">
            <h2 className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-3">ABOUT THIS BATCH</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{batch.description}</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="grid sm:grid-cols-2 gap-3 mb-8">
          <DetailRow icon={Calendar} label="Start Date" value={batch.startDate || "TBA"} />
          <DetailRow icon={Clock} label="Schedule" value={batch.schedule || "TBA"} />
          <DetailRow icon={Video} label="Mode" value={batch.mode} />
          <DetailRow icon={User} label="Instructor" value={batch.instructor || "TBA"} />
          <DetailRow icon={Users} label="Capacity" value={`${batch.seats} seats`} />
          <DetailRow icon={ShieldCheck} label="Level" value={batch.level} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold mb-1">Ready to enroll?</h3>
              <p className="text-xs text-muted-foreground">{batch.googleFormUrl ? "Click the button to fill the registration form. Our team will contact you within 24 hours." : "Contact us to register for this batch."}</p>
            </div>
            {batch.googleFormUrl ? (
              <a href={batch.googleFormUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">ENROLL NOW <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </a>
            ) : (
              <Button onClick={() => navigate({ name: "contact" })} className="bg-gradient-to-r from-violet-600 to-violet-500 text-white">Contact us <ArrowRight className="h-4 w-4 ml-2" /></Button>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">SHARE THIS BATCH:</span>
            <Button size="sm" variant="outline" onClick={copyLink} className="h-8 text-xs"><Copy className="h-3 w-3 mr-1.5" /> Copy Link</Button>
            <Button size="sm" variant="outline" onClick={shareWhatsApp} className="h-8 text-xs border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"><MessageCircle className="h-3 w-3 mr-1.5" /> WhatsApp</Button>
            <Button size="sm" variant="outline" onClick={shareLinkedIn} className="h-8 text-xs border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"><Linkedin className="h-3 w-3 mr-1.5" /> LinkedIn</Button>
          </div>
        </motion.div>

        <div className="mt-8 pt-6 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: "catalog" })}><GraduationCap className="h-4 w-4 mr-1.5" /> Browse all courses</Button>
        </div>
      </div>
    </main>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3 flex items-center gap-3">
      <div className="inline-flex p-1.5 rounded-md bg-muted/30 shrink-0"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
      <div><div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div><div className="text-sm font-medium">{value}</div></div>
    </div>
  )
}
