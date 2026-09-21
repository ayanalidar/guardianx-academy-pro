"use client"

import * as React from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Heart, Star, ArrowRight, GraduationCap, Briefcase,
  Trophy, Zap, Quote, MapPin, Sparkles, Users, Award, Building2,
  Globe, Target, TrendingUp, ShieldCheck, Shield, BadgeCheck,
  Network, Cpu, Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrollReveal, Stagger, StaggerItem, TextReveal,
  MagneticButton, Counter, CursorGlow,
} from "@/components/platform/motion-system"
import { usePageContent, getContent, getContentArray } from "@/lib/use-content"

/* ============================================================
   DATA
   ============================================================ */

const keyStats = [
  {
    value: 12000, suffix: "+", label: "Active Learners",
    icon: Users, accent: "text-violet-300", tint: "bg-violet-500/10",
  },
  {
    value: 8500, suffix: "+", label: "Certificates Issued",
    icon: Award, accent: "text-amber-300", tint: "bg-amber-500/10",
  },
  {
    value: 94, suffix: "%", label: "Exam Pass Rate",
    icon: Target, accent: "text-cyan-300", tint: "bg-cyan-500/10",
  },
  {
    value: 150, suffix: "+", label: "Partner Institutions",
    icon: Building2, accent: "text-violet-300", tint: "bg-violet-500/10",
  },
  {
    value: 31, suffix: "", label: "Hands-on Labs",
    icon: Zap, accent: "text-rose-300", tint: "bg-rose-500/10",
  },
  {
    value: 28, suffix: "+", label: "Certification Tracks",
    icon: Trophy, accent: "text-teal-300", tint: "bg-teal-500/10",
  },
]

const outcomes = [
  {
    icon: TrendingUp, value: 68, prefix: "", suffix: "%",
    label: "Career advancement", accent: "text-violet-300",
    desc: "of certified learners report a promotion or new role within 6 months.",
  },
  {
    icon: Briefcase, value: 12, prefix: "₹", suffix: "L",
    label: "Avg salary increase", accent: "text-amber-300",
    desc: "post-certification compensation jump for Indian professionals.",
  },
  {
    icon: Rocket, value: 3.2, prefix: "", suffix: "x",
    label: "More interview calls", accent: "text-cyan-300",
    desc: "compared to non-certified peers in the same talent pool.",
  },
  {
    icon: BadgeCheck, value: 92, prefix: "", suffix: "%",
    label: "Job placement rate", accent: "text-teal-300",
    desc: "for graduates of our intensive cyber security bootcamps.",
  },
]

const stories = [
  {
    name: "Priya Sharma",
    transition: "Security Analyst → SOC Lead",
    company: "TCS Cyber Defense",
    avatar: "PS",
    tint: "bg-violet-500/15 text-violet-200",
    cert: "CEH",
    quote:
      "GuardianX's CEH track was a complete game-changer. The hands-on labs gave me real confidence during incident response. Within 4 months of certification, I was promoted to SOC Lead.",
  },
  {
    name: "Rahul Verma",
    transition: "Network Engineer → Security Engineer",
    company: "Infosys",
    avatar: "RV",
    tint: "bg-cyan-500/15 text-cyan-200",
    cert: "CCNP Security",
    quote:
      "The CCNA + CCNP Security tracks were exactly what I needed. Live sessions with industry experts were invaluable - I now lead security initiatives across enterprise networks.",
  },
  {
    name: "Ananya Reddy",
    transition: "Student → Penetration Tester",
    company: "Wipro",
    avatar: "AR",
    tint: "bg-amber-500/15 text-amber-200",
    cert: "WAPT",
    quote:
      "As a fresher, the WAPT labs gave me hands-on experience no textbook could. I landed my pentest role directly because of the skills I demonstrated in the technical interview.",
  },
  {
    name: "Vikram Singh",
    transition: "IT Admin → CyberArk Specialist",
    company: "HCL Technologies",
    avatar: "VS",
    tint: "bg-violet-500/15 text-violet-200",
    cert: "CyberArk PAM",
    quote:
      "The CyberArk PAM certification was niche and hard to find anywhere else. GuardianX made it accessible with great content, practical labs, and a proctored final I respected.",
  },
  {
    name: "Meera Krishnan",
    transition: "College Student → Security Intern",
    company: "Deloitte",
    avatar: "MK",
    tint: "bg-rose-500/15 text-rose-200",
    cert: "CISSP",
    quote:
      "Our college partnered with GuardianX and I completed CISSP prep alongside my degree. The verifiable certificate helped me stand out and win the Deloitte internship.",
  },
  {
    name: "Arjun Patel",
    transition: "Helpdesk → System Administrator",
    company: "Tech Mahindra",
    avatar: "AP",
    tint: "bg-teal-500/15 text-teal-200",
    cert: "RHCSA",
    quote:
      "The RHCSA track was practical and thorough. The proctored exam ensured I actually knew the material. Got my promotion to Sysadmin right after clearing the certification.",
  },
]

const partners = [
  { type: "Schools", count: 85, icon: Building2, accent: "text-violet-300", tint: "bg-violet-500/10" },
  { type: "Colleges", count: 45, icon: GraduationCap, accent: "text-cyan-300", tint: "bg-cyan-500/10" },
  { type: "Universities", count: 20, icon: Trophy, accent: "text-amber-300", tint: "bg-amber-500/10" },
]

const regions = [
  { region: "South India", learners: 4200, pct: 35 },
  { region: "North India", learners: 3100, pct: 26 },
  { region: "West India", learners: 2400, pct: 20 },
  { region: "East India", learners: 1500, pct: 12.5 },
  { region: "International", learners: 800, pct: 6.5 },
]

/* ============================================================
   VIEW
   ============================================================ */

export function ImpactView() {
  const { navigate } = useAppStore()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80])

  // CMS-driven hero copy - falls back to defaults if CMS data missing.
  const cms = usePageContent("impact")
  const cmsData = cms.data
  const heroBadge = getContent(cmsData, "hero", "badge", "OUR IMPACT")
  const heroTitle = getContent(cmsData, "hero", "title", "Transforming careers,")
  const heroTitleAccent = getContent(cmsData, "hero", "titleAccent", "securing the future.")
  const heroDesc = getContent(cmsData, "hero", "description", "Every number tells a story - a learner who leveled up their career, an institution that transformed its curriculum, and a community quietly making the digital world safer.")
  const statsEyebrow = getContent(cmsData, "stats", "eyebrow", "BY THE NUMBERS")
  const statsTitle = getContent(cmsData, "stats", "title", "Scale that creates real opportunity")
  const outcomesEyebrow = getContent(cmsData, "outcomes", "eyebrow", "CAREER OUTCOMES")
  const outcomesTitle = getContent(cmsData, "outcomes", "title", "Real results, real careers")
  const outcomesDesc = getContent(cmsData, "outcomes", "description", "Measured impact on our learners' professional trajectories, tracked 6-12 months post-certification.")
  const storiesEyebrow = getContent(cmsData, "stories", "eyebrow", "SUCCESS STORIES")
  const storiesTitle = getContent(cmsData, "stories", "title", "Learners who became guardians")
  const storiesDesc = getContent(cmsData, "stories", "description", "Real journeys from our community - verified by their certificates.")
  const missionEyebrow = getContent(cmsData, "mission", "eyebrow", "PARTNER INSTITUTIONS")
  const missionTitle = getContent(cmsData, "mission", "title", "Educating the next generation")
  const missionDesc = getContent(cmsData, "mission", "description", "We partner with schools, colleges, and universities to bring cyber security education to their students - verified curricula, shared labs, and joint certifications.")
  const missionCta = getContent(cmsData, "mission", "cta", "Become a Partner")

  return (
    <div ref={containerRef} className="relative">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[48vh] flex items-center overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <motion.div
          style={{ y: heroY }}
          className="absolute top-1/4 left-1/3 w-[520px] h-[420px] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none"
        />
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, 60]) }}
          className="absolute bottom-0 right-1/4 w-[420px] h-[320px] bg-cyan-500/8 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Badge
              variant="outline"
              className="mb-4 border-violet-500/30 text-violet-300 bg-violet-500/5 backdrop-blur"
            >
              <Heart className="h-3 w-3 mr-1.5" /> {heroBadge}
            </Badge>

            <h1
              className="font-bold tracking-tight text-balance mb-4"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.5rem)", lineHeight: 1.05 }}
            >
              {heroTitle}
              <br />
              <span className="text-gradient-premium">{heroTitleAccent}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {heroDesc}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-300" /> Verified outcomes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <Network className="h-3.5 w-3.5 text-cyan-300" /> Pan-India reach
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
                <Cpu className="h-3.5 w-3.5 text-amber-300" /> Industry-aligned
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== KEY STATS ===== */}
      <section className="py-8 lg:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-6">
            <Badge
              variant="outline"
              className="mb-3 border-violet-500/20 text-violet-300 bg-violet-500/5"
            >
              <Sparkles className="h-3 w-3 mr-1.5" /> {statsEyebrow}
            </Badge>
            <h2
              className="font-semibold tracking-tight text-balance"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              {statsTitle}
            </h2>
          </ScrollReveal>

          <Stagger
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            staggerChildren={0.08}
          >
            {keyStats.map((s) => (
              <StaggerItem key={s.label} className="h-full">
                <Card className="bg-card shadow-lg p-5 sm:p-6 text-center h-full border-border/60 hover:border-violet-500/30 transition-colors">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center h-11 w-11 rounded-xl mb-3",
                      s.tint
                    )}
                  >
                    <s.icon className={cn("h-5 w-5", s.accent)} />
                  </div>
                  <div
                    className="font-bold tracking-tight"
                    style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}
                  >
                    <Counter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-[0.14em] mt-1.5">
                    {s.label}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===== CAREER OUTCOMES ===== */}
      <section className="py-8 lg:py-10 border-t border-border bg-card/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[320px] bg-violet-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-3 border-violet-500/20 text-violet-300 bg-violet-500/5"
            >
              <TrendingUp className="h-3 w-3 mr-1.5" /> {outcomesEyebrow}
            </Badge>
            <h2
              className="font-semibold tracking-tight text-balance mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              {outcomesTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              {outcomesDesc}
            </p>
          </ScrollReveal>

          <Stagger
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
            staggerChildren={0.1}
          >
            {outcomes.map((o) => (
              <StaggerItem key={o.label} className="h-full">
                <Card className="bg-card shadow-lg p-6 h-full border-border/60 hover:border-violet-500/30 transition-colors flex flex-col">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center h-10 w-10 rounded-lg mb-4 bg-muted/60",
                      o.accent
                    )}
                  >
                    <o.icon className="h-5 w-5" />
                  </div>
                  <div
                    className="font-bold tracking-tight mb-2 text-gradient-premium"
                    style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
                  >
                    <Counter value={o.value} prefix={o.prefix} suffix={o.suffix} />
                  </div>
                  <div className="font-semibold text-sm mb-1.5">{o.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {o.desc}
                  </p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===== SUCCESS STORIES ===== */}
      <section className="py-8 lg:py-10 border-t border-border relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-3 border-amber-500/20 text-amber-300 bg-amber-500/5"
            >
              <Star className="h-3 w-3 mr-1.5" /> {storiesEyebrow}
            </Badge>
            <h2
              className="font-semibold tracking-tight text-balance mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              {storiesTitle}
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {storiesDesc}
            </p>
          </ScrollReveal>

          <Stagger
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            staggerChildren={0.1}
          >
            {stories.map((s) => (
              <StaggerItem key={s.name} className="h-full">
                <CursorGlow className="group h-full">
                  <Card className="bg-card shadow-lg p-6 h-full border-border/60 hover:border-violet-500/30 transition-colors flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <Quote className="h-7 w-7 text-violet-300/30" />
                      <Badge
                        variant="outline"
                        className="text-[10px] border-violet-500/30 text-violet-200 bg-violet-500/5"
                      >
                        <Shield className="h-3 w-3 mr-1" /> {s.cert}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic flex-1">
                      &ldquo;{s.quote}&rdquo;
                    </p>

                    <div className="flex items-center gap-3 pt-4 border-t border-border">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarFallback
                          className={cn("text-xs font-mono font-semibold", s.tint)}
                        >
                          {s.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{s.name}</div>
                        <div className="text-[11px] text-violet-200/80 truncate">
                          {s.transition}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {s.company}
                        </div>
                      </div>
                    </div>
                  </Card>
                </CursorGlow>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ===== PARTNER INSTITUTIONS ===== */}
      <section className="py-8 lg:py-10 border-t border-border bg-card/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[400px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-3 border-cyan-500/20 text-cyan-300 bg-cyan-500/5"
            >
              <Building2 className="h-3 w-3 mr-1.5" /> {missionEyebrow}
            </Badge>
            <h2
              className="font-semibold tracking-tight text-balance mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              {missionTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              {missionDesc}
            </p>
          </ScrollReveal>

          <Stagger
            className="grid sm:grid-cols-3 gap-6 mb-6"
            staggerChildren={0.12}
          >
            {partners.map((p) => (
              <StaggerItem key={p.type} className="h-full">
                <Card className="bg-card shadow-lg p-8 text-center h-full border-border/60 hover:border-violet-500/30 transition-colors">
                  <div
                    className={cn(
                      "inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4 border border-border",
                      p.tint
                    )}
                  >
                    <p.icon className={cn("h-7 w-7", p.accent)} />
                  </div>
                  <div
                    className="font-bold tracking-tight"
                    style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}
                  >
                    <Counter value={p.count} suffix="+" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 uppercase tracking-[0.12em]">
                    {p.type}
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="text-center">
            <MagneticButton strength={0.3} className="inline-block">
              <Button
                variant="outline"
                onClick={() => navigate({ name: "contact" })}
                className="px-6 h-12 bg-card shadow-md hover:bg-card/80"
              >
                {missionCta} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* ===== REGIONAL REACH ===== */}
      <section className="py-8 lg:py-10 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-14">
            <Badge
              variant="outline"
              className="mb-3 border-violet-500/20 text-violet-300 bg-violet-500/5"
            >
              <Globe className="h-3 w-3 mr-1.5" /> REGIONAL REACH
            </Badge>
            <h2
              className="font-semibold tracking-tight text-balance mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              Learners across India &amp; beyond
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Distribution of 12,000+ active learners across regions - a
              community that spans the country and grows globally.
            </p>
          </ScrollReveal>

          <div className="max-w-2xl mx-auto space-y-5">
            {regions.map((r, i) => (
              <ScrollReveal key={r.region} delay={i * 0.08}>
                <div className="bg-card shadow-sm border border-border/60 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm mb-2.5">
                    <span className="font-medium flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-violet-300" /> {r.region}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                      <Counter value={r.learners} /> learners ({r.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${r.pct}%` }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        duration: 1.1,
                        delay: i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-500/70 via-violet-400 to-cyan-400/80"
                    />
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-8 lg:py-10 border-t border-border relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-card shadow-lg p-10 lg:p-16 scanlines">
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[160px] bg-violet-500/15 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 right-1/3 w-[380px] h-[140px] bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex p-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 mb-6"
                >
                  <Sparkles className="h-8 w-8 text-violet-300" strokeWidth={1.5} />
                </motion.div>

                <h2
                  className="font-semibold tracking-tight text-balance mb-4"
                  style={{ fontSize: "clamp(1.75rem, 4.5vw, 3rem)" }}
                >
                  Be the next success story
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-6 text-base sm:text-lg">
                  Join thousands of learners who transformed their careers with
                  GuardianX Academy. Your certification, your impact, your future.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <MagneticButton strength={0.4} className="inline-block">
                    <Button
                      size="lg"
                      onClick={() => navigate({ name: "login" })}
                      className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 btn-premium shadow-lg shadow-violet-500/20"
                    >
                      Start Learning <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </MagneticButton>
                  <MagneticButton strength={0.3} className="inline-block">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate({ name: "home" })}
                      className="h-12 px-8 text-base bg-card shadow-md hover:bg-card/80"
                    >
                      Explore Courses
                    </Button>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
