"use client"

/**
 * Deep-link compatibility shim.
 *
 * The Batch Leads Hub was absorbed into the unified Leads Hub
 * (admin-lead-crm.tsx) as its "Batch Enrollments" segment. This wrapper
 * keeps every existing /admin-batch-hub deep link (and the view-router's
 * import) working - it renders the same hub with that segment pre-opened.
 */

import { LeadCrmView } from "@/views/admin-lead-crm"

export function AdminBatchHubView({ initialBatchId }: { initialBatchId?: string }) {
  return <LeadCrmView initialSegment="batches" initialBatchId={initialBatchId} />
}
