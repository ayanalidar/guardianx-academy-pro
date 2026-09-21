"use client"

import * as React from "react"

/* ============================================================
   useCurrency - fixed INR pricing
   ------------------------------------------------------------
   The platform bills in INR only: every price stored in the
   database is an INR amount and every surface renders it with
   the ₹ symbol and Indian digit grouping (1,50,000).

   The old multi-currency detection/conversion pipeline was
   removed (it default-detected USD for international visitors,
   which displayed INR amounts prefixed with a wrong $ sign).
   The hook keeps its previous API shape so call sites
   (course-detail, cyber-quiz-results, …) need no changes.
   ============================================================ */

export function useCurrency() {
  const formatPrice = React.useCallback((inrAmount: number): string => {
    const rounded = Math.round(Number.isFinite(inrAmount) ? inrAmount : 0)
    return `₹${rounded.toLocaleString("en-IN")}`
  }, [])

  const convertPrice = React.useCallback((inrAmount: number): number => {
    return Math.round(Number.isFinite(inrAmount) ? inrAmount : 0)
  }, [])

  return {
    currencyCode: "INR" as const,
    currencySymbol: "₹",
    currencyLabel: "Indian Rupee",
    currencies: [] as { code: string; symbol: string; label: string }[],
    rate: 1,
    formatPrice,
    convertPrice,
    changeCurrency: React.useCallback((_code: string) => {
      /* single-currency platform - no-op */
    }, []),
    isINR: true,
  }
}
