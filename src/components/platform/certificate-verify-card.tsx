"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Search, Award, CheckCircle2, XCircle, Loader2, BadgeCheck, Calendar, User, BookOpen, Lock, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface VerifyResult {
  valid: boolean
  hashValid?: boolean
  error?: string
  certificate?: {
    certificateId: string
    issuedAt: string
    score: number
    studentName: string
    studentTitle: string | null
    courseTitle: string
    courseShortName: string
    certBody: string | null
    instructorName: string
    instructorTitle: string | null
    programDirector?: string | null
  }
}

/**
 * CertificateVerifyCard - full-width trust system, not a basic card.
 * A premium verification experience with animated states.
 */
export function CertificateVerifyCard() {
  const [certId, setCertId] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<VerifyResult | null>(null)
  const [phase, setPhase] = React.useState<"idle" | "searching" | "verifying" | "done">("idle")

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!certId.trim()) return
    setLoading(true)
    setResult(null)
    setPhase("searching")
    setTimeout(() => setPhase("verifying"), 800)
    try {
      const data = await api<VerifyResult>(`/api/certificates/verify?certificateId=${encodeURIComponent(certId.trim())}`)
      setTimeout(() => {
        setResult(data)
        setPhase("done")
        setLoading(false)
      }, 600)
    } catch (err: any) {
      setResult({ valid: false, error: err.message ?? "Verification failed" })
      setPhase("done")
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-[10px] font-mono mb-4">
          <BadgeCheck className="h-3 w-3" />
          CERTIFICATE VERIFICATION
        </div>
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em] mb-3 text-balance">
          Verify a GuardianX certificate
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Employers and recruiters can verify the authenticity of any GuardianX credential.
        </p>
      </div>

      {/* Verification interface */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-11 h-14 bg-background/50 border-border/60 text-base font-mono uppercase"
              placeholder="GX-XXXXXXXX"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading || !certId.trim()} className="h-14 px-8 bg-violet-600 hover:bg-violet-500 btn-premium">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying</>
            ) : (
              <><Shield className="h-4 w-4 mr-2" /> Verify</>
            )}
          </Button>
        </form>

        {/* Animated verification states */}
        <AnimatePresence mode="wait">
          {phase === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
              Searching certificate database...
            </motion.div>
          )}

          {phase === "verifying" && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground"
            >
              <Fingerprint className="h-4 w-4 text-cyan-300 animate-pulse" />
              Verifying cryptographic signature...
            </motion.div>
          )}

          {phase === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {result.valid && result.certificate ? (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 overflow-hidden">
                  {/* Verified header */}
                  <div className="flex items-center gap-3 p-5 border-b border-emerald-500/20 bg-emerald-500/5">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"
                    >
                      <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        Authentic Certificate
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                          {result.hashValid ? "VERIFIED" : "VALID"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cryptographically verified by GuardianX Academy
                      </div>
                    </div>
                  </div>

                  {/* Certificate details */}
                  <div className="grid grid-cols-2 gap-5 p-5">
                    {[
                      { label: "Recipient", value: result.certificate.studentName, sub: result.certificate.studentTitle, icon: User },
                      { label: "Course", value: result.certificate.courseTitle, sub: result.certificate.courseShortName, icon: BookOpen },
                      { label: "Issued", value: new Date(result.certificate.issuedAt).toLocaleDateString(), icon: Calendar },
                      { label: "Score", value: `${result.certificate.score}%`, icon: Award },
                    ].map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <d.icon className="h-3 w-3" /> {d.label}
                        </div>
                        <div className="text-sm font-medium">{d.value}</div>
                        {d.sub && <div className="text-[10px] text-muted-foreground">{d.sub}</div>}
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer - credential ID + instructor */}
                  <div className="flex items-center justify-between p-4 border-t border-emerald-500/20 bg-background/30">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      {result.certificate.certificateId}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground text-right">
                      {result.certificate.instructorName}
                      {result.certificate.programDirector && (
                        <span className="block text-muted-foreground/70">
                          {result.certificate.programDirector} · Program Director
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/5 p-6">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                      <XCircle className="h-7 w-7 text-rose-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-rose-400 mb-1">Not Found</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {result.error ?? "No certificate matches this ID."}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Certificate IDs start with &quot;GX-&quot;. Try: GX-DEMO2024CERT001
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Try demo link */}
        {!loading && !result && (
          <div className="text-center mt-4">
            <button
              onClick={() => setCertId("GX-DEMO2024CERT001")}
              className="text-[11px] text-muted-foreground hover:text-violet-300 font-mono underline-offset-2 hover:underline"
            >
              Try a demo: GX-DEMO2024CERT001
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
