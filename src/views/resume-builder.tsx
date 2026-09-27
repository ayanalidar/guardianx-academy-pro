"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ScrollReveal } from "@/components/platform/motion-system"
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Save,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  GraduationCap,
  Briefcase,
  Award,
  Code,
  User as UserIcon,
  FolderGit2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

/* ============================================================
   ResumeBuilderView - form + live preview + auto-populate
   ============================================================ */

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
interface CertItem {
  title: string
  issuer: string
  date: string
  verificationId?: string
}
interface ContactInfo {
  name?: string
  email?: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
  title?: string
}
interface Resume {
  id: string
  template: string
  summary: string
  experience: ExperienceItem[]
  education: EducationItem[]
  skills: string[]
  certifications: CertItem[]
  projects: ProjectItem[]
  contactInfo: ContactInfo
  isPublic: boolean
}

const TEMPLATES = [
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "professional", label: "Professional" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
]

function downloadResumeHtml(r: Resume) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${r.contactInfo.name || "Resume"} - Resume</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 0 24px; line-height: 1.55; }
  h1 { margin: 0 0 4px 0; font-size: 28px; color: #4c1d95; }
  .title { font-size: 14px; color: #6b7280; margin-bottom: 12px; }
  .contact { font-size: 12px; color: #4b5563; margin-bottom: 20px; }
  .contact span { margin-right: 12px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #4c1d95; border-bottom: 2px solid #ede9fe; padding-bottom: 4px; margin: 24px 0 12px 0; }
  .item { margin-bottom: 14px; }
  .item-head { font-weight: 600; font-size: 14px; }
  .item-sub { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  ul { margin: 0; padding-left: 18px; font-size: 13px; }
  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill { background: #ede9fe; color: #4c1d95; padding: 2px 10px; border-radius: 12px; font-size: 11px; }
</style>
</head>
<body>
  <h1>${r.contactInfo.name || "Your Name"}</h1>
  <div class="title">${r.contactInfo.title || ""}</div>
  <div class="contact">
    ${r.contactInfo.email ? `<span>${r.contactInfo.email}</span>` : ""}
    ${r.contactInfo.phone ? `<span>${r.contactInfo.phone}</span>` : ""}
    ${r.contactInfo.location ? `<span>${r.contactInfo.location}</span>` : ""}
    ${r.contactInfo.linkedin ? `<span>${r.contactInfo.linkedin}</span>` : ""}
    ${r.contactInfo.github ? `<span>${r.contactInfo.github}</span>` : ""}
  </div>

  ${r.summary ? `<h2>Summary</h2><p>${r.summary}</p>` : ""}

  ${r.experience.length > 0 ? `<h2>Experience</h2>${r.experience.map(e => `
    <div class="item">
      <div class="item-head">${e.title}</div>
      <div class="item-sub">${e.company} · ${e.startDate} - ${e.endDate || "Present"}</div>
      <div>${e.description.replace(/\n/g, "<br/>")}</div>
    </div>
  `).join("")}` : ""}

  ${r.education.length > 0 ? `<h2>Education</h2>${r.education.map(e => `
    <div class="item">
      <div class="item-head">${e.degree}</div>
      <div class="item-sub">${e.institution} · ${e.startDate} - ${e.endDate || "Present"}</div>
    </div>
  `).join("")}` : ""}

  ${r.certifications.length > 0 ? `<h2>Certifications</h2><ul>${r.certifications.map(c => `
    <li><strong>${c.title}</strong> - ${c.issuer} (${c.date})${c.verificationId ? ` · ID: ${c.verificationId}` : ""}</li>
  `).join("")}</ul>` : ""}

  ${r.skills.length > 0 ? `<h2>Skills</h2><div class="skills">${r.skills.map(s => `<span class="skill">${s}</span>`).join("")}</div>` : ""}

  ${r.projects.length > 0 ? `<h2>Projects</h2>${r.projects.map(p => `
    <div class="item">
      <div class="item-head">${p.title}${p.link ? ` · <a href="${p.link}" style="color:#4c1d95;font-size:12px;font-weight:normal;">${p.link}</a>` : ""}</div>
      <div>${p.description}</div>
    </div>
  `).join("")}` : ""}

  <p style="text-align:center;margin-top:40px;font-size:11px;color:#9ca3af;">
    Generated by GuardianX Academy Resume Builder
  </p>
</body>
</html>`
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${(r.contactInfo.name || "resume").replace(/\s+/g, "-").toLowerCase()}-resume.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ResumeBuilderView() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ resume: Resume }>({
    queryKey: ["resume"],
    queryFn: () => api("/api/resume"),
  })

  const [form, setForm] = React.useState<Resume | null>(null)
  const [newSkill, setNewSkill] = React.useState("")

  React.useEffect(() => {
    if (data?.resume) {
      setForm(data.resume)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (vars: Partial<Resume> & { autopopulate?: boolean }) => {
      const { autopopulate, ...rest } = vars
      const url = autopopulate ? "/api/resume?autopopulate=true" : "/api/resume"
      return api<{ resume: Resume }>(url, {
        method: "POST",
        body: JSON.stringify(rest),
      })
    },
    onSuccess: (data) => {
      setForm(data.resume)
      qc.invalidateQueries({ queryKey: ["resume"] })
      toast.success("Resume saved")
    },
    onError: (err: any) => toast.error(err?.message || "Save failed"),
  })

  const autopopulateMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("No resume loaded")
      return api<{ resume: Resume }>("/api/resume?autopopulate=true", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          // The server will refill certs + skills + summary if missing
        }),
      })
    },
    onSuccess: (data) => {
      setForm(data.resume)
      qc.invalidateQueries({ queryKey: ["resume"] })
      toast.success(
        `Auto-populated ${data.resume.certifications.length} certifications and ${data.resume.skills.length} skills`
      )
    },
    onError: (err: any) => toast.error(err?.message || "Auto-populate failed"),
  })

  const update = <K extends keyof Resume>(key: K, value: Resume[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  if (isLoading || !form) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-12 w-72 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[600px] rounded-2xl" />
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.25em]">
              RESUME BUILDER
            </span>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-3 text-balance">
            Build your <span className="text-gradient-premium">resume</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-muted-foreground max-w-xl mb-8">
            Craft a professional resume with auto-populated GuardianX certifications, courses, and
            labs. Edit, preview live, and download in one click.
          </p>
        </ScrollReveal>

        {/* Action bar */}
        <ScrollReveal delay={0.25}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={form.template} onValueChange={(v) => update("template", v)}>
              <SelectTrigger className="h-9 w-[160px] text-xs bg-card border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => autopopulateMutation.mutate()}
              disabled={autopopulateMutation.isPending}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
            >
              {autopopulateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Auto-populate from GuardianX
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500 btn-premium"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadResumeHtml(form)}
              className="ml-auto border-border/60"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download HTML
            </Button>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORM */}
          <ScrollReveal className="lg:col-span-7" delay={0.3}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6 space-y-6">
              {/* Contact */}
              <Section icon={UserIcon} title="Contact Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full name">
                    <Input
                      value={form.contactInfo.name || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, name: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="Title / headline">
                    <Input
                      value={form.contactInfo.title || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, title: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={form.contactInfo.email || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, email: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={form.contactInfo.phone || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, phone: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={form.contactInfo.location || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, location: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <Input
                      value={form.contactInfo.linkedin || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, linkedin: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="GitHub">
                    <Input
                      value={form.contactInfo.github || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, github: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                  <Field label="Website">
                    <Input
                      value={form.contactInfo.website || ""}
                      onChange={(e) =>
                        update("contactInfo", { ...form.contactInfo, website: e.target.value })
                      }
                      className="bg-background/40 h-9 text-sm"
                    />
                  </Field>
                </div>
              </Section>

              <Separator />

              {/* Summary */}
              <Section icon={FileText} title="Professional Summary">
                <Textarea
                  value={form.summary}
                  onChange={(e) => update("summary", e.target.value)}
                  placeholder="A concise 2-3 sentence summary of your background and strengths..."
                  className="bg-background/40 text-sm min-h-[80px]"
                />
              </Section>

              <Separator />

              {/* Experience */}
              <Section
                icon={Briefcase}
                title="Experience"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      update("experience", [
                        ...form.experience,
                        { title: "", company: "", startDate: "", endDate: "", description: "" },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                }
              >
                <div className="space-y-3">
                  {form.experience.length === 0 ? (
                    <EmptyHint text="No experience added yet." />
                  ) : (
                    form.experience.map((e, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-background/30 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Job title"
                            value={e.title}
                            onChange={(ev) => {
                              const copy = [...form.experience]
                              copy[i] = { ...copy[i], title: ev.target.value }
                              update("experience", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="Company"
                            value={e.company}
                            onChange={(ev) => {
                              const copy = [...form.experience]
                              copy[i] = { ...copy[i], company: ev.target.value }
                              update("experience", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="Start (e.g. Jan 2024)"
                            value={e.startDate}
                            onChange={(ev) => {
                              const copy = [...form.experience]
                              copy[i] = { ...copy[i], startDate: ev.target.value }
                              update("experience", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="End (or Present)"
                            value={e.endDate}
                            onChange={(ev) => {
                              const copy = [...form.experience]
                              copy[i] = { ...copy[i], endDate: ev.target.value }
                              update("experience", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                        </div>
                        <Textarea
                          placeholder="What did you do?"
                          value={e.description}
                          onChange={(ev) => {
                            const copy = [...form.experience]
                            copy[i] = { ...copy[i], description: ev.target.value }
                            update("experience", copy)
                          }}
                          className="bg-background/40 text-xs min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-rose-300 hover:bg-rose-500/10"
                          onClick={() =>
                            update(
                              "experience",
                              form.experience.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Section>

              <Separator />

              {/* Education */}
              <Section
                icon={GraduationCap}
                title="Education"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      update("education", [
                        ...form.education,
                        { degree: "", institution: "", startDate: "", endDate: "" },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                }
              >
                <div className="space-y-3">
                  {form.education.length === 0 ? (
                    <EmptyHint text="No education added yet." />
                  ) : (
                    form.education.map((e, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-background/30 p-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Degree"
                            value={e.degree}
                            onChange={(ev) => {
                              const copy = [...form.education]
                              copy[i] = { ...copy[i], degree: ev.target.value }
                              update("education", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="Institution"
                            value={e.institution}
                            onChange={(ev) => {
                              const copy = [...form.education]
                              copy[i] = { ...copy[i], institution: ev.target.value }
                              update("education", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="Start"
                            value={e.startDate}
                            onChange={(ev) => {
                              const copy = [...form.education]
                              copy[i] = { ...copy[i], startDate: ev.target.value }
                              update("education", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                          <Input
                            placeholder="End"
                            value={e.endDate}
                            onChange={(ev) => {
                              const copy = [...form.education]
                              copy[i] = { ...copy[i], endDate: ev.target.value }
                              update("education", copy)
                            }}
                            className="bg-background/40 h-8 text-xs"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-rose-300 hover:bg-rose-500/10"
                          onClick={() =>
                            update(
                              "education",
                              form.education.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Section>

              <Separator />

              {/* Skills */}
              <Section icon={Code} title="Skills">
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSkill.trim()) {
                        update("skills", [...form.skills, newSkill.trim()])
                        setNewSkill("")
                      }
                    }}
                    placeholder="Type a skill and press Enter..."
                    className="bg-background/40 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newSkill.trim()) {
                        update("skills", [...form.skills, newSkill.trim()])
                        setNewSkill("")
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.skills.length === 0 ? (
                    <EmptyHint text="No skills added yet." />
                  ) : (
                    form.skills.map((s, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] border-violet-500/30 bg-violet-500/10 text-violet-300 cursor-pointer hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition-colors"
                        onClick={() =>
                          update(
                            "skills",
                            form.skills.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        {s} <Trash2 className="h-2.5 w-2.5 ml-1" />
                      </Badge>
                    ))
                  )}
                </div>
              </Section>

              <Separator />

              {/* Certifications (auto-populated) */}
              <Section
                icon={Award}
                title="Certifications"
                badge={
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
                    {form.certifications.length} from GuardianX
                  </Badge>
                }
              >
                {form.certifications.length === 0 ? (
                  <EmptyHint text="No certifications yet - use Auto-populate to import from your GuardianX profile." />
                ) : (
                  <div className="space-y-1.5">
                    {form.certifications.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md border border-border/40 bg-background/30 p-2.5"
                      >
                        <Award className="h-4 w-4 text-amber-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.issuer} · {c.date}
                          </p>
                        </div>
                        {c.verificationId && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            #{c.verificationId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Separator />

              {/* Projects */}
              <Section
                icon={FolderGit2}
                title="Projects"
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      update("projects", [...form.projects, { title: "", description: "", link: "" }])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                }
              >
                <div className="space-y-3">
                  {form.projects.length === 0 ? (
                    <EmptyHint text="No projects added yet." />
                  ) : (
                    form.projects.map((p, i) => (
                      <div key={i} className="rounded-lg border border-border/60 bg-background/30 p-3 space-y-2">
                        <Input
                          placeholder="Project title"
                          value={p.title}
                          onChange={(ev) => {
                            const copy = [...form.projects]
                            copy[i] = { ...copy[i], title: ev.target.value }
                            update("projects", copy)
                          }}
                          className="bg-background/40 h-8 text-xs"
                        />
                        <Input
                          placeholder="Link (optional)"
                          value={p.link || ""}
                          onChange={(ev) => {
                            const copy = [...form.projects]
                            copy[i] = { ...copy[i], link: ev.target.value }
                            update("projects", copy)
                          }}
                          className="bg-background/40 h-8 text-xs"
                        />
                        <Textarea
                          placeholder="Short description"
                          value={p.description}
                          onChange={(ev) => {
                            const copy = [...form.projects]
                            copy[i] = { ...copy[i], description: ev.target.value }
                            update("projects", copy)
                          }}
                          className="bg-background/40 text-xs min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-rose-300 hover:bg-rose-500/10"
                          onClick={() =>
                            update(
                              "projects",
                              form.projects.filter((_, idx) => idx !== i)
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Section>
            </div>
          </ScrollReveal>

          {/* PREVIEW */}
          <ScrollReveal className="lg:col-span-5" delay={0.35}>
            <div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden sticky top-6">
              <div className="p-4 border-b border-border/60 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-300" />
                <span className="text-sm font-semibold">Live Preview</span>
                <Badge variant="outline" className="ml-auto text-[10px] capitalize">
                  {form.template}
                </Badge>
              </div>
              <ScrollArea className="max-h-[700px] bg-white text-neutral-900">
                <div className="p-8">
                  {/* Header */}
                  <h1 className="text-2xl font-bold text-violet-900 mb-0.5">
                    {form.contactInfo.name || "Your Name"}
                  </h1>
                  {form.contactInfo.title && (
                    <p className="text-sm text-neutral-600 mb-3">{form.contactInfo.title}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600 mb-5 pb-4 border-b border-neutral-200">
                    {form.contactInfo.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {form.contactInfo.email}
                      </span>
                    )}
                    {form.contactInfo.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {form.contactInfo.phone}
                      </span>
                    )}
                    {form.contactInfo.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {form.contactInfo.location}
                      </span>
                    )}
                    {form.contactInfo.linkedin && (
                      <span className="flex items-center gap-1">
                        <Linkedin className="h-3 w-3" /> {form.contactInfo.linkedin}
                      </span>
                    )}
                    {form.contactInfo.github && (
                      <span className="flex items-center gap-1">
                        <Github className="h-3 w-3" /> {form.contactInfo.github}
                      </span>
                    )}
                    {form.contactInfo.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {form.contactInfo.website}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  {form.summary && (
                    <PreviewSection title="Summary">
                      <p className="text-xs text-neutral-700 leading-relaxed">{form.summary}</p>
                    </PreviewSection>
                  )}

                  {/* Experience */}
                  {form.experience.length > 0 && (
                    <PreviewSection title="Experience">
                      {form.experience.map((e, i) => (
                        <div key={i} className="mb-3">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-semibold text-neutral-900">{e.title}</p>
                            <p className="text-[10px] text-neutral-500">
                              {e.startDate} - {e.endDate || "Present"}
                            </p>
                          </div>
                          <p className="text-[11px] text-violet-700 mb-1">{e.company}</p>
                          <p className="text-xs text-neutral-700 whitespace-pre-wrap">{e.description}</p>
                        </div>
                      ))}
                    </PreviewSection>
                  )}

                  {/* Education */}
                  {form.education.length > 0 && (
                    <PreviewSection title="Education">
                      {form.education.map((e, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex items-baseline justify-between">
                            <p className="text-sm font-semibold text-neutral-900">{e.degree}</p>
                            <p className="text-[10px] text-neutral-500">
                              {e.startDate} - {e.endDate || "Present"}
                            </p>
                          </div>
                          <p className="text-[11px] text-violet-700">{e.institution}</p>
                        </div>
                      ))}
                    </PreviewSection>
                  )}

                  {/* Certifications */}
                  {form.certifications.length > 0 && (
                    <PreviewSection title="Certifications">
                      <ul className="space-y-1">
                        {form.certifications.map((c, i) => (
                          <li key={i} className="text-xs text-neutral-700">
                            <span className="font-semibold">{c.title}</span> - {c.issuer} ({c.date})
                          </li>
                        ))}
                      </ul>
                    </PreviewSection>
                  )}

                  {/* Skills */}
                  {form.skills.length > 0 && (
                    <PreviewSection title="Skills">
                      <div className="flex flex-wrap gap-1.5">
                        {form.skills.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </PreviewSection>
                  )}

                  {/* Projects */}
                  {form.projects.length > 0 && (
                    <PreviewSection title="Projects">
                      {form.projects.map((p, i) => (
                        <div key={i} className="mb-2">
                          <p className="text-sm font-semibold text-neutral-900">
                            {p.title || "Untitled project"}
                          </p>
                          <p className="text-xs text-neutral-700">{p.description}</p>
                          {p.link && (
                            <p className="text-[10px] text-violet-700 break-all">{p.link}</p>
                          )}
                        </div>
                      ))}
                    </PreviewSection>
                  )}

                  <p className="text-center text-[10px] text-neutral-400 mt-6 pt-4 border-t border-neutral-200">
                    Generated by GuardianX Academy Resume Builder
                  </p>
                </div>
              </ScrollArea>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
  action,
  badge,
}: {
  icon: any
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-violet-300" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground/70 italic">{text}</p>
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-violet-900 border-b-2 border-violet-100 pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}
