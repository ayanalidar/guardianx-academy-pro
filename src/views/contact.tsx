"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail, Phone, MapPin, Globe, Clock, Send, MessageSquare, Building2,
  GraduationCap, Shield, ChevronRight, CheckCircle2, Loader2, Users,
  Briefcase, Heart, ArrowRight, Linkedin, Youtube, Instagram, MessageCircle, Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ScrollReveal, Stagger, StaggerItem, TextReveal, MagneticButton, CursorGlow } from "@/components/platform/motion-system"
import { usePageContent, getContent } from "@/lib/use-content"

// ===== REAL contact data =====
const CONTACT = {
  email: "academy@guardianx.in",
  emailHref: "mailto:academy@guardianx.in",
  phone: "+91-70067-1234-7",
  phoneHref: "tel:+917006712347",
  website: "academy.guardianx.cloud",
  websiteHref: "https://academy.guardianx.cloud",
  addressLines: [
    "110 - Nooripora",
    "Tehsil Pattan, District Baramulla",
    "Kashmir, India 193401",
  ],
  mapsHref: "https://maps.google.com/?q=Nooripora+Pattan+Baramulla+Kashmir+193401",
  hours: "Mon - Sat · 9:00 AM - 6:00 PM IST",
}

const CONTACT_METHODS = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT.email,
    href: CONTACT.emailHref,
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
  {
    icon: Phone,
    label: "Phone",
    value: CONTACT.phone,
    href: CONTACT.phoneHref,
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Baramulla, Kashmir",
    href: CONTACT.mapsHref,
    color: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  {
    icon: Globe,
    label: "Website",
    value: CONTACT.website,
    href: CONTACT.websiteHref,
    color: "text-violet-300",
    bg: "bg-violet-500/10",
  },
]

const CATEGORIES = [
  { value: "general", label: "General Inquiry", icon: MessageSquare },
  { value: "partnership", label: "Institution Partnership", icon: Building2 },
  { value: "courses", label: "Course Information", icon: GraduationCap },
  { value: "technical", label: "Technical Support", icon: Shield },
  { value: "careers", label: "Careers", icon: Briefcase },
]

const RESPONSE_TIMES = [
  { label: "General inquiries", time: "< 24 hours", color: "text-violet-300 border-violet-500/30" },
  { label: "Partnership requests", time: "< 48 hours", color: "text-cyan-300 border-cyan-500/30" },
  { label: "Technical support", time: "< 12 hours", color: "text-amber-300 border-amber-500/30" },
  { label: "Careers", time: "Ongoing", color: "text-violet-300 border-violet-500/30" },
]

const SOCIALS = [
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/company/guardianx-academy/" },
  { icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@guardianx-academy" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/guardianx.academy" },
  { icon: MessageCircle, label: "WhatsApp Channel", href: "https://whatsapp.com/channel/0029VbBpCY98KMqcAkZuIJ1e" },
]

const FAQS = [
  {
    q: "How do I enroll in a course?",
    a: "Create a free account, browse our course catalog, and click 'Enroll' on any course. Most courses are free to start, and you can upgrade to a certification track anytime.",
  },
  {
    q: "Are the certificates verifiable?",
    a: "Yes! Every certificate issued by GuardianX has a unique ID (GX-XXXXX) that can be publicly verified on our homepage by employers and recruiters - no login required.",
  },
  {
    q: "How do hands-on labs work?",
    a: "Our labs run in Docker containers that spin up on demand. Each lab has a target environment and a flag to capture. Submit the flag for instant grading and XP.",
  },
  {
    q: "Can my school, college, or university partner with GuardianX?",
    a: "Absolutely. We partner with institutions across India and beyond. Use the form above with category 'Institution Partnership' and we'll set up your dedicated multi-tenant portal.",
  },
  {
    q: "Do you offer live sessions?",
    a: "Yes. Instructors host live screen-sharing workshops with two-way voice and a collaborative whiteboard. Check the Live Sessions tab in your dashboard for upcoming sessions.",
  },
  {
    q: "Where is GuardianX Academy based?",
    a: `Our office is at ${CONTACT.addressLines[0]}, ${CONTACT.addressLines[1]}, ${CONTACT.addressLines[2]}. Reach us by email at ${CONTACT.email} or phone at ${CONTACT.phone}.`,
  },
]

export function ContactView() {
  const { navigate } = useAppStore()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [category, setCategory] = React.useState("general")
  const [message, setMessage] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  // CMS-driven hero + form copy - falls back to defaults.
  const cms = usePageContent("contact")
  const cmsData = cms.data
  const heroBadge = getContent(cmsData, "hero", "badge", "CONTACT US")
  const heroTitle = getContent(cmsData, "hero", "title", "Let's build a")
  const heroTitleAccent = getContent(cmsData, "hero", "titleAccent", "safer world together")
  const heroDesc = getContent(cmsData, "hero", "description", "Have questions about courses, partnerships, or anything else? We'd love to hear from you - our team responds fast.")
  const formTitle = getContent(cmsData, "formFields", "title", "Send us a message")
  const formSubtitle = getContent(cmsData, "formFields", "subtitle", "Fill out the form and our team will respond within 24 hours.")
  const nameLabel = getContent(cmsData, "formFields", "nameLabel", "Full Name")
  const namePlaceholder = getContent(cmsData, "formFields", "namePlaceholder", "Jane Doe")
  const emailLabel = getContent(cmsData, "formFields", "emailLabel", "Email")
  const emailPlaceholder = getContent(cmsData, "formFields", "emailPlaceholder", "jane@example.com")
  const categoryLabel = getContent(cmsData, "formFields", "categoryLabel", "Category")
  const subjectLabel = getContent(cmsData, "formFields", "subjectLabel", "Subject")
  const subjectPlaceholder = getContent(cmsData, "formFields", "subjectPlaceholder", "How can we help?")
  const messageLabel = getContent(cmsData, "formFields", "messageLabel", "Message")
  const messagePlaceholder = getContent(cmsData, "formFields", "messagePlaceholder", "Tell us more about what you need...")
  const submitCta = getContent(cmsData, "formFields", "submitCta", "Send Message")
  const successTitle = getContent(cmsData, "formFields", "successTitle", "Message sent!")
  const successDesc = getContent(cmsData, "formFields", "successDesc", "Thanks for reaching out. We'll get back to you at the email you provided.")
  const successCta = getContent(cmsData, "formFields", "successCta", "Send another message")

  const mutation = useMutation({
    mutationFn: () =>
      api("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, category, message }),
      }),
    onSuccess: () => {
      toast.success("Message sent! We'll get back to you within 24 hours.")
      setSubmitted(true)
      setName("")
      setEmail("")
      setSubject("")
      setCategory("general")
      setMessage("")
    },
    onError: (e: any) => toast.error(e.message || "Failed to send message"),
  })

  return (
    <div className="relative">
      {/* ============================================================
          SECTION 1 - HERO
          ============================================================ */}
      <section className="relative pt-4 pb-6 lg:pb-8 overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-mesh pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[300px] bg-violet-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[250px] bg-cyan-500/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Badge variant="outline" className="mb-4 border-cyan-500/20 text-cyan-300 bg-cyan-500/5">
              <MessageSquare className="h-3 w-3 mr-1" /> {heroBadge}
            </Badge>
            <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.02em] mb-4 text-balance">
              {heroTitle}
              <br />
              <span className="text-gradient-premium">{heroTitleAccent}</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {heroDesc}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 - CONTACT METHODS (4 solid cards)
          ============================================================ */}
      <section className="py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" staggerChildren={0.1}>
            {CONTACT_METHODS.map((m) => (
              <StaggerItem key={m.label} className="h-full">
                <a href={m.href} target={m.label === "Website" || m.label === "Address" ? "_blank" : undefined} rel="noreferrer" className="group block h-full">
                  <Card className="bg-card shadow-lg border border-border p-6 h-full transition-all hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.6_0.2_295_/_0.25)]">
                    <div className={cn("inline-flex p-3 rounded-xl mb-4 transition-transform group-hover:scale-110", m.bg)}>
                      <m.icon className={cn("h-5 w-5", m.color)} />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
                      {m.label}
                    </div>
                    <div className="text-sm font-medium group-hover:text-violet-300 transition-colors flex items-center gap-1">
                      <span className="truncate">{m.value}</span>
                      <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                    </div>
                  </Card>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 - FORM + INFO (2 columns, no overlap)
          ============================================================ */}
      <section className="py-8 lg:py-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* ---- LEFT: Contact Form (solid card) ---- */}
            <ScrollReveal>
              <Card className="bg-card shadow-lg border border-border p-6 sm:p-8 lg:p-10">
                <h2 className="text-2xl font-bold tracking-tight mb-2">{formTitle}</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {formSubtitle}
                </p>

                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="h-20 w-20 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle2 className="h-10 w-10 text-violet-300" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">{successTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      {successDesc}
                    </p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      {successCta}
                    </Button>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      mutation.mutate()
                    }}
                    className="space-y-5"
                  >
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="c-name">{nameLabel}</Label>
                        <Input
                          id="c-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={namePlaceholder}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="c-email">{emailLabel}</Label>
                        <Input
                          id="c-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={emailPlaceholder}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{categoryLabel}</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              <span className="flex items-center gap-2">
                                <c.icon className="h-3.5 w-3.5" /> {c.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-subject">{subjectLabel}</Label>
                      <Input
                        id="c-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={subjectPlaceholder}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-message">{messageLabel}</Label>
                      <Textarea
                        id="c-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={messagePlaceholder}
                        rows={5}
                        required
                        className="resize-none"
                      />
                    </div>

                    <MagneticButton strength={0.2} className="w-full">
                      <Button
                        type="submit"
                        className="w-full btn-premium py-6"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" /> {submitCta}
                          </>
                        )}
                      </Button>
                    </MagneticButton>
                  </form>
                )}
              </Card>
            </ScrollReveal>

            {/* ---- RIGHT: Info cards stack (each in solid card) ---- */}
            <div className="space-y-6">
              {/* Response times */}
              <ScrollReveal delay={0.1}>
                <Card className="bg-card shadow-lg border border-border p-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-violet-300" /> Response Times
                  </h3>
                  <div className="space-y-3 text-sm">
                    {RESPONSE_TIMES.map((r) => (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{r.label}</span>
                        <Badge variant="outline" className={r.color}>{r.time}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </ScrollReveal>

              {/* Office info with Kashmir address */}
              <ScrollReveal delay={0.2}>
                <Card className="bg-card shadow-lg border border-border p-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-cyan-300" /> Our Office
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-violet-300 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-foreground font-medium">GuardianX Academy HQ</div>
                        {CONTACT.addressLines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Clock className="h-4 w-4 text-violet-300 shrink-0" />
                      <span>{CONTACT.hours}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Phone className="h-4 w-4 text-cyan-300 shrink-0" />
                      <a href={CONTACT.phoneHref} className="hover:text-foreground transition-colors">
                        {CONTACT.phone}
                      </a>
                    </div>
                  </div>

                  {/* Map placeholder - styled, not real */}
                  <div className="mt-5 rounded-xl border border-border bg-background/40 h-44 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid opacity-30" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
                        <div className="relative h-12 w-12 rounded-full bg-violet-500/15 border border-violet-500/40 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-violet-300" />
                        </div>
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-violet-400 animate-ping" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium">Pattan, Baramulla</div>
                        <div className="text-[10px] text-muted-foreground">Kashmir, India 193401</div>
                      </div>
                      <a
                        href={CONTACT.mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-violet-300 hover:text-violet-200 transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Navigation className="h-3 w-3" /> View on Maps
                      </a>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>

              {/* Connect with us - socials */}
              <ScrollReveal delay={0.3}>
                <Card className="bg-card shadow-lg border border-border p-6">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-violet-300" /> Connect with us
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    {SOCIALS.map((s) => (
                      <motion.a
                        key={s.label}
                        href={s.href}
                        aria-label={s.label}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-10 w-10 rounded-lg border border-border bg-background/40 hover:bg-violet-500/10 hover:border-violet-500/40 flex items-center justify-center transition-all"
                      >
                        <s.icon className="h-4 w-4 text-muted-foreground hover:text-violet-300" />
                      </motion.a>
                    ))}
                  </div>
                </Card>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 - FAQ
          ============================================================ */}
      <section className="py-8 lg:py-10 border-t border-border bg-card/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-6">
            <Badge variant="outline" className="mb-4 border-amber-500/20 text-amber-300 bg-amber-500/5">
              <Heart className="h-3 w-3 mr-1" /> FAQ
            </Badge>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight mb-3">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground">Quick answers to common questions.</p>
          </ScrollReveal>

          <Stagger className="space-y-3" staggerChildren={0.08}>
            {FAQS.map((f, i) => (
              <StaggerItem key={i}>
                <Card className="bg-card shadow-lg border border-border p-5">
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-sm flex items-center justify-between list-none">
                      {f.q}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform duration-300 shrink-0 ml-3" />
                    </summary>
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed">
                      {f.a}
                    </p>
                  </details>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="text-center mt-10">
            <p className="text-sm text-muted-foreground mb-3">Still have questions?</p>
            <MagneticButton strength={0.3}>
              <Button variant="outline" onClick={() => navigate({ name: "login" })}>
                Create an account to get started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  )
}
