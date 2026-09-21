"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useAppStore } from "@/store/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Award, Search, Loader2, ArrowRight, Fingerprint, ShieldOff, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Cert {
  id: string
  credentialId: string
  candidateName: string
  email: string
  difficulty: string
  score: number
  totalQuestions: number
  percentage: number
  issueDate: string
  status: string
  verificationUrl: string | null
}

export function AdminCyberQuizCertsView() {
  const { navigate } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")

  const { data, isLoading } = useQuery<{ certificates: Cert[]; count: number; total?: number }>({
    queryKey: ["admin-cyber-quiz-certs", search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      return api(`/api/admin/cyber-quiz/certificates?${params.toString()}`)
    },
  })

  const certs = data?.certificates ?? []
  const validCount = certs.filter((c) => c.status !== "revoked").length
  const totalIssued = (data as any)?.total ?? certs.length

  // Revoke / restore - persisted via PATCH; was impossible before (no route)
  const revokeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "valid" | "revoked" }) =>
      api(`/api/admin/cyber-quiz/certificates/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-cyber-quiz-certs"] })
      toast.success(vars.status === "revoked" ? "Certificate revoked - it will no longer verify" : "Certificate restored")
    },
    onError: (e: any) => toast.error(e.message || "Status update failed"),
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-6 w-6 text-violet-400" />
          <h1 className="text-2xl font-bold tracking-tight">Quiz Certificates</h1>
        </div>
        <p className="text-sm text-muted-foreground">All issued Cyber Security Foundation certificates.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Total issued</div>
          <div className="text-2xl font-bold tabular-nums">{totalIssued}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Avg score</div>
          <div className="text-2xl font-bold tabular-nums">{certs.length ? Math.round(certs.reduce((a, c) => a + c.percentage, 0) / certs.length) + "%" : " - "}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">Revoked</div>
          <div className="text-2xl font-bold tabular-nums text-rose-300">{certs.filter((c) => c.status === "revoked").length}</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by credential ID, name, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No certificates issued yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[700px] overflow-y-auto custom-scrollbar">
            {certs.map((c) => {
              const revoked = c.status === "revoked"
              return (
                <div
                  key={c.id}
                  className={cn(
                    "p-4 hover:bg-violet-500/[0.03] transition-colors flex items-start justify-between gap-3",
                    revoked && "opacity-70",
                  )}
                >
                  <button
                    onClick={() => navigate({ name: "cyber-quiz-certificate", credentialId: c.credentialId } as any)}
                    className="flex items-start gap-3 min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 text-violet-300 shrink-0">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={cn("font-medium text-sm truncate", revoked && "line-through")}>{c.candidateName}</span>
                        <Badge variant="outline" className="text-[9px]">{c.difficulty}</Badge>
                        <Badge variant="secondary" className="text-[9px] font-mono">{c.credentialId}</Badge>
                        {revoked && (
                          <Badge className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/30">REVOKED</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{c.email}</span>
                        <span className="tabular-nums">{c.score}/{c.totalQuestions} · {c.percentage}%</span>
                        <span>{new Date(c.issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      revoked
                        ? "text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
                        : "text-rose-300 hover:bg-rose-500/10 border-rose-500/30",
                    )}
                    onClick={() =>
                      revokeMutation.mutate({
                        id: c.id,
                        status: revoked ? "valid" : "revoked",
                      })
                    }
                    disabled={revokeMutation.isPending}
                  >
                    {revoked ? (
                      <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Restore</>
                    ) : (
                      <><ShieldOff className="h-3.5 w-3.5 mr-1" /> Revoke</>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
