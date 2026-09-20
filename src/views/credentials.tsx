"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Award, ShieldCheck, ArrowRight, Search, Copy, Check,
  ExternalLink, Calendar, Hash, TrendingUp, Lock,
} from "lucide-react"
import { toast } from "sonner"

export function CredentialsView() {
  const { navigate } = useAppStore()
  const [verifyId, setVerifyId] = React.useState("")
  const [verifyResult, setVerifyResult] = React.useState<any>(null)
  const [verifying, setVerifying] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)

  const { data: credsData, isLoading } = useQuery({
    queryKey: ["my-credentials"],
    queryFn: async () => {
      const res = await fetch("/api/credentials")
      if (!res.ok) return null
      return res.json()
    },
  })

  const credentials = credsData?.credentials ?? []

  async function handleVerify() {
    if (!verifyId.trim()) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch(`/api/credentials/verify/${encodeURIComponent(verifyId.trim())}`)
      const data = await res.json()
      setVerifyResult(data)
    } catch {
      setVerifyResult({ valid: false, error: "Failed to verify" })
    } finally {
      setVerifying(false)
    }
  }

  function copyUrl(credId: string) {
    // Origin-relative canonical path (legacy /#/verify/… hash form still
    // redirects, but this is the clean shareable URL).
    const url = `${window.location.origin}/verify/${credId}`
    navigator.clipboard?.writeText(url)
    setCopied(credId)
    toast.success("Verification URL copied!")
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="relative min-h-screen pt-2 lg:pt-4">
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />

      {/* HERO */}
      <section className="relative py-6 lg:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-300 bg-emerald-500/5">
              <ShieldCheck className="h-3 w-3 mr-1.5" /> GUARDIANX CREDENTIALS
            </Badge>
            <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-balance">
              Prove what{" "}
              <span className="text-gradient-premium">you know.</span>
            </h1>
            <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Verifiable digital credentials for the cybersecurity industry. Every GuardianX credential
              is cryptographically signed and publicly verifiable.
            </p>
          </motion.div>
        </div>
      </section>

      {/* MY CREDENTIALS */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-[10px] font-mono text-violet-400 tracking-[0.25em] mb-2">MY CREDENTIALS</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">Your earned certifications.</h2>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-48 rounded-xl border border-border/60 bg-card animate-pulse" />
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border/60 bg-card">
              <Award className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No credentials yet.</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Complete a proctored exam to earn your first GuardianX credential.</p>
              <Button size="sm" onClick={() => navigate({ name: "exams" })} className="bg-violet-600 hover:bg-violet-500">
                EXPLORE EXAMS <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {credentials.map((cred: any, i: number) => (
                <motion.div
                  key={cred.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="card-premium rounded-xl p-5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex p-2.5 rounded-lg bg-violet-500/10 text-violet-300">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{cred.certification?.name ?? "GuardianX Certification"}</h3>
                        <Badge variant="outline" className="text-[9px] font-mono mt-1 text-emerald-300 border-emerald-500/30 bg-emerald-500/5">
                          <Check className="h-2.5 w-2.5 mr-1" /> VERIFIED
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-xs mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Hash className="h-3 w-3" /> Credential ID</span>
                      <span className="font-mono text-foreground">{cred.credentialId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Issued</span>
                      <span className="text-foreground">{new Date(cred.issueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Score</span>
                      <span className="text-foreground font-semibold">{cred.score}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Lock className="h-3 w-3" /> Status</span>
                      <span className={cn("font-semibold capitalize", cred.status === "valid" ? "text-emerald-300" : "text-amber-300")}>{cred.status}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  {cred.skillsAssessed?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-border/40">
                      {cred.skillsAssessed.map((s: string) => (
                        <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">{s}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => copyUrl(cred.credentialId)}>
                      {copied === cred.credentialId ? <><Check className="h-3.5 w-3.5 mr-1.5" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" /> Share</>}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate({ name: "verify", credentialId: cred.credentialId })}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Verify
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PUBLIC VERIFICATION */}
      <section className="py-6 lg:py-8 border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] mb-2">PUBLIC VERIFICATION</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold tracking-[-0.02em]">Verify a credential.</h2>
            <p className="text-sm text-muted-foreground mt-2">Enter a GuardianX credential ID to verify its authenticity.</p>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. GX-CERT-2025-XXXX"
                className="pl-9 font-mono"
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
            </div>
            <Button onClick={handleVerify} disabled={verifying || !verifyId.trim()} className="bg-violet-600 hover:bg-violet-500 btn-premium">
              {verifying ? "Verifying..." : "Verify"}
            </Button>
          </div>

          {verifyResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={cn(
              "rounded-xl border p-5",
              verifyResult.valid ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
            )}>
              {verifyResult.valid ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="h-5 w-5 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">VERIFIED</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Candidate</span><span className="font-medium">{verifyResult.credential.candidateName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Certification</span><span className="font-medium">{verifyResult.credential.certificationName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span className="font-medium">{verifyResult.credential.score}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span className="font-medium">{new Date(verifyResult.credential.issueDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{verifyResult.credential.status}</span></div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-semibold">INVALID</span>
                  <span className="text-sm text-muted-foreground">{verifyResult.error || "Credential not found or revoked."}</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
