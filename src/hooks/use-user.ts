"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface UserStats {
  enrollments: number
  completed: number
  inProgress: number
  notes: number
  labsDone: number
  certificates: number
  avgScore: number
}

export interface GamificationInfo {
  xp: number
  level: number
  streak: number
  rank: string
  levelInfo: { level: number; currentLevelXp: number; nextLevelXp: number; progress: number }
}

export interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  title: string | null
  bio: string | null
  schoolId: string | null
}

export function useUser() {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useQuery<{ user: CurrentUser | null; stats: UserStats; gamification: GamificationInfo }>({
    queryKey: ["me"],
    queryFn: () => api("/api/me"),
  })

  // CRITICAL: the [me] cache can hold the PRE-LOGIN `{ user: null }`
  // response (fetched on the login page). Global staleTime is 30s and
  // window-focus refetching is off, so inside the SPA that stale null
  // used to stick indefinitely - dashboards rendered "Operator" with
  // zero courses ("the courses don't show"). When the auth screens
  // signal a session change, invalidate so every consumer refetches.
  React.useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    }
    window.addEventListener("guardianx-session-changed", handler)
    return () => window.removeEventListener("guardianx-session-changed", handler)
  }, [queryClient])

  return {
    user: data?.user ?? null,
    stats: data?.stats,
    gamification: data?.gamification,
    isLoading,
    refetch,
  }
}
