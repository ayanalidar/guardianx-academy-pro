"use client"
import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Scale, ArrowRight, Clock, Shield, FileText, Building2, Lock } from "lucide-react"

const CAT_ICONS: Record<string, any> = { Fundamentals: Scale, Frameworks: Shield, Compliance: FileText, "Risk Assessment": Shield, Governance: Building2, Audit: FileText, Privacy: Lock, "Third-Party Risk": Building2 }

export function GrcView() {
  const { navigate } = useAppStore()
  const { data } = useQuery({
    queryKey: ["grc"],
    queryFn: async () => { try { const r = await fetch("/api/grc"); return r.ok ? r.json() : null } catch { return null } },
  })
  const content = data?.content ?? []
  const categories = Array.from(new Set(content.map((c: any) => c.category as string)))

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <section className="relative py-6 lg:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-4 border-blue-500/30 text-blue-300 bg-blue-500/5"><Scale className="h-3 w-3 mr-1.5" /> GRC</Badge>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-3 text-balance">Governance. Risk. <span className="text-gradient-premium">Compliance.</span></h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">Master the frameworks, policies, and practices that keep organizations secure. ISO 27001, NIST, SOC 2, PCI DSS, and more.</p>
        </div>
      </section>
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {content.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Loading GRC content...</Card>
          ) : (
            <div className="space-y-8">
              {(categories as string[]).map((cat) => (
                <div key={cat}>
                  <h2 className="text-sm font-semibold mb-3 text-blue-300">{cat}</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {content.filter((c: any) => c.category === cat).map((c: any, i: number) => {
                      const Icon = CAT_ICONS[c.category] || Scale
                      return (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                          <Card className="p-5 hover:border-blue-500/30 transition-colors h-full flex flex-col">
                            <div className="flex items-start justify-between mb-3">
                              <div className="inline-flex p-2.5 rounded-lg bg-blue-500/10"><Icon className="h-5 w-5 text-blue-300" /></div>
                              <Badge variant="outline" className="text-[9px]">{c.level}</Badge>
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{c.title}</h3>
                            {c.framework && <p className="text-xs text-blue-300 mb-2">{c.framework}</p>}
                            {c.duration && <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"><Clock className="h-3 w-3" /> {c.duration}</div>}
                            <Button size="sm" variant="outline" onClick={() => navigate({ name: "catalog" })} className="mt-auto">Learn More <ArrowRight className="h-3 w-3 ml-1.5" /></Button>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
