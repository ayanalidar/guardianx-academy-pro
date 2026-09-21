"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import {
  Check, Sparkles, Crown, Building2, Rocket, Shield,
  TrendingUp, Users, Award, FlaskConical, Terminal, Radio,
  IndianRupee, Zap, Headset, Server, Mail, Lock,
} from "lucide-react"
import { toast } from "sonner"

/* ---------------------------------------------------------------- *
 *  Types                                                            *
 * ---------------------------------------------------------------- */
type Plan = {
  id: string
  name: string
  price: number
  features: string[]
  popular: boolean
  order: number
  active: boolean
  createdAt: string
}

type PlansResponse = { plans: Plan[]; isDefault: boolean }

/* ---------------------------------------------------------------- *
 *  Static config - icons + accent per plan name                     *
 * ---------------------------------------------------------------- */
const PLAN_VISUALS: Record<string, {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  tint: string
  ring: string
  glow: string
}> = {
  Free: {
    icon: Sparkles,
    accent: "text-cyan-300",
    tint: "from-cyan-500/10 to-cyan-500/5",
    ring: "border-cyan-500/30",
    glow: "shadow-[0_0_40px_-12px_rgba(34,211,238,0.4)]",
  },
  Pro: {
    icon: Crown,
    accent: "text-violet-300",
    tint: "from-violet-500/15 to-violet-500/5",
    ring: "border-violet-500/40",
    glow: "shadow-[0_0_50px_-12px_rgba(139,92,246,0.5)]",
  },
  Enterprise: {
    icon: Building2,
    accent: "text-emerald-300",
    tint: "from-emerald-500/10 to-emerald-500/5",
    ring: "border-emerald-500/30",
    glow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.4)]",
  },
}

function visualFor(name: string) {
  return PLAN_VISUALS[name] ?? {
    icon: Sparkles,
    accent: "text-violet-300",
    tint: "from-violet-500/10 to-violet-500/5",
    ring: "border-violet-500/30",
    glow: "shadow-[0_0_40px_-12px_rgba(139,92,246,0.3)]",
  }
}

/* ---------------------------------------------------------------- *
 *  Comparison table rows - kept concise per spec                    *
 * ---------------------------------------------------------------- */
const COMPARISON_ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: "Starter course access", values: ["5 courses", "All courses", "All + custom cohorts"] },
  { label: "Hands-on cyber labs", values: ["10 labs", "31+ labs", "31+ labs + dedicated"] },
  { label: "Proctored exam eligibility", values: [false, true, true] },
  { label: "Verifiable certificates", values: [false, true, true] },
  { label: "AI Assistant queries", values: [" - ", "200 / month", "Unlimited"] },
  { label: "Live sessions", values: ["Public only", "All sessions", "Priority + recordings"] },
  { label: "Dedicated instructor + mentor", values: [false, false, true] },
  { label: "Institution admin dashboard", values: [false, false, true] },
  { label: "Bulk certificate issuance", values: [false, false, true] },
  { label: "API + SSO integration", values: [false, false, true] },
  { label: "Quarterly security audits", values: [false, false, true] },
  { label: "Support response time", values: ["Community", "48 hours", "24×7 priority"] },
]

/* ---------------------------------------------------------------- *
 *  FAQ items                                                        *
 * ---------------------------------------------------------------- */
const FAQS: { q: string; a: string }[] = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes. You can upgrade or downgrade your subscription anytime from your account settings. Upgrades take effect immediately; downgrades take effect at the end of your current billing cycle. No cancellation fees.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. The listed price is the monthly price in Indian Rupees (INR), inclusive of all taxes. Proctored exam fees are bundled into Pro and Enterprise - you don't pay extra per exam.",
  },
  {
    q: "Do you offer student discounts?",
    a: "Yes. Verified students from partner schools, colleges, and universities get discounted cohort pricing through their institution. For individual student discounts, apply via our scholarship program (see the FAQ page).",
  },
  {
    q: "What payment methods are accepted?",
    a: "All major credit/debit cards, UPI (for India-based learners), PayPal, and bank transfers for institutional partnerships. Enterprise plans can also be invoiced annually.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is permanently free - no trial period, no credit card required. Upgrade to Pro or Enterprise whenever you're ready to unlock the full catalog and proctored exams.",
  },
  {
    q: "What happens to my certificates if I cancel?",
    a: "Certificates you've already earned remain valid and verifiable forever. Cancellation only affects future course access - your past achievements are yours to keep.",
  },
]

/* ---------------------------------------------------------------- *
 *  Component                                                        *
 * ---------------------------------------------------------------- */
export function PricingView() {
  const { navigate } = useAppStore()

  const { data, isLoading, error } = useQuery<PlansResponse>({
    queryKey: ["subscription-plans"],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const res = await fetch("/api/subscription-plans")
      if (!res.ok) throw new Error("Failed to load pricing plans")
      return res.json()
    },
  })

  const plans = data?.plans ?? []
  // Always render 3 columns even while loading - keeps the layout stable
  const displayPlans = plans.length > 0 ? plans : []

  function handleChoose(plan: Plan) {
    // Free plan → sign up; paid plans → contact sales for now (the task
    // spec doesn't ask for a checkout flow, just a "Choose Plan" button).
    if (plan.price === 0) {
      navigate({ name: "login" })
      toast.info("Sign up to start learning for free!")
    } else if (plan.name.toLowerCase() === "enterprise") {
      navigate({ name: "contact" })
      toast.info("Contact our sales team for Enterprise onboarding")
    } else {
      navigate({ name: "login" })
      toast.info("Sign in to upgrade to " + plan.name)
    }
  }

  return (
    <div className="relative min-h-screen pb-16">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-30">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-32 right-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-[10px] font-mono uppercase tracking-widest text-violet-300 mb-6">
            <Zap className="h-3 w-3" /> Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
            Simple, <span className="text-gradient-premium">transparent pricing</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your journey. From free starter courses to enterprise-grade
            cohort programs - no hidden fees, cancel anytime.
          </p>
        </motion.div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        {isLoading ? (
          <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center border-rose-500/30 bg-rose-500/5 max-w-md mx-auto">
            <p className="text-sm text-rose-300 mb-3">Could not load pricing plans.</p>
            <Button variant="outline" size="sm" onClick={() => navigate({ name: "home" })}>
              Back home
            </Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPlans.map((plan, i) => {
              const v = visualFor(plan.name)
              const Icon = v.icon
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={cn(
                    "relative rounded-2xl border bg-gradient-to-br backdrop-blur",
                    v.tint,
                    plan.popular ? `${v.ring} ${v.glow} lg:-translate-y-3` : "border-border/60",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-violet-600 hover:bg-violet-600 text-[10px] font-bold uppercase tracking-widest border-violet-400/40 shadow-lg">
                        <Sparkles className="h-3 w-3 mr-1" /> Popular
                      </Badge>
                    </div>
                  )}

                  <div className="p-6 sm:p-8">
                    {/* Plan header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("inline-flex p-2.5 rounded-xl bg-white/5", v.accent)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-[11px] text-muted-foreground">
                          {plan.name === "Free" ? "Get started" : plan.name === "Pro" ? "For serious learners" : "For institutions & teams"}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <IndianRupee className="h-5 w-5 text-muted-foreground" />
                        <span className="text-4xl font-bold tracking-tight">
                          {plan.price.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">/month</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {plan.price === 0 ? "Free forever, no credit card" : "Billed monthly · cancel anytime"}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-6 min-h-[200px]">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-sm">
                          <Check className={cn("h-4 w-4 mt-0.5 shrink-0", v.accent)} />
                          <span className="text-muted-foreground leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      className={cn(
                        "w-full",
                        plan.popular
                          ? "bg-violet-600 hover:bg-violet-500"
                          : "bg-background border border-border hover:bg-muted/40 text-foreground",
                      )}
                      onClick={() => handleChoose(plan)}
                    >
                      {plan.price === 0 ? "Start Free" : `Choose ${plan.name}`}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Trust strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-400" /> 14-day refund policy</span>
          <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> Secure payments</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-emerald-400" /> 12,000+ active learners</span>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Compare plans</h2>
          <p className="text-sm text-muted-foreground">A full breakdown of what's included in each plan.</p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Feature</th>
                  {displayPlans.map((p) => (
                    <th key={p.id} className="py-4 px-5 text-[11px] font-bold uppercase tracking-wider text-center min-w-[120px]">
                      <div className={cn("font-semibold", visualFor(p.name).accent)}>{p.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="py-3 px-5 text-sm text-foreground">{row.label}</td>
                    {displayPlans.map((p, j) => {
                      const v = row.values[j]
                      return (
                        <td key={p.id} className="py-3 px-5 text-center text-sm">
                          {typeof v === "boolean" ? (
                            v ? (
                              <Check className="h-4 w-4 mx-auto text-emerald-400" />
                            ) : (
                              <span className="text-muted-foreground/40"> - </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">{v}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Frequently asked questions</h2>
          <p className="text-sm text-muted-foreground">Everything you need to know about pricing.</p>
        </div>
        <Card className="p-4 sm:p-6">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left hover:no-underline text-sm font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        {/* Still have questions */}
        <Card className="mt-6 p-6 text-center border-violet-500/30 bg-violet-500/5">
          <Headset className="h-8 w-8 text-violet-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">Our team is happy to help with plan selection, custom cohorts, and institutional partnerships.</p>
          <Button
            onClick={() => navigate({ name: "contact" })}
            className="bg-violet-600 hover:bg-violet-500"
          >
            <Mail className="h-4 w-4 mr-2" /> Talk to us
          </Button>
        </Card>
      </section>
    </div>
  )
}
