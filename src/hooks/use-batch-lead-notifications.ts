"use client"

import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useUser } from "@/hooks/use-user"

/**
 * useBatchLeadNotifications — polls for new batch leads + shows browser
 * push notifications when a new lead comes in.
 *
 * Only activates for ADMIN users. Uses the Web Notifications API.
 * Polls every 30 seconds. Tracks the last seen lead ID to detect new ones.
 */
export function useBatchLeadNotifications() {
  const { user } = useUser()
  const isAdmin = user?.role === "ADMIN"

  // Track the last seen lead timestamp
  const lastSeenRef = useRef<string | null>(null)

  // Poll for batch leads
  const { data } = useQuery<{ leads: { id: string; name: string; createdAt: string; batch?: { name: string } }[] }>({
    queryKey: ["batch-lead-notifications"],
    queryFn: () => api("/api/admin/batch-leads"),
    refetchInterval: 30_000, // 30 seconds
    enabled: !!isAdmin,
  })

  useEffect(() => {
    if (!isAdmin || !data?.leads?.length) return

    // Request notification permission on first load
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    const latestLead = data.leads[0]
    
    // Skip if this is the first load (just record the latest)
    if (!lastSeenRef.current) {
      lastSeenRef.current = latestLead.createdAt
      return
    }

    // Check if there's a new lead
    if (new Date(latestLead.createdAt) > new Date(lastSeenRef.current)) {
      lastSeenRef.current = latestLead.createdAt
      
      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Batch Lead! 🎯", {
          body: `${latestLead.name} just registered${latestLead.batch?.name ? ` for ${latestLead.batch.name}` : ""}`,
          icon: "/guardianx-logo-v2.png",
          tag: "batch-lead",
        })
      }
    }
  }, [data, isAdmin])
}
