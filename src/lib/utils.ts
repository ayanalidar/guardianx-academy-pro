import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * firstNameFor - greeting-safe first-name extraction.
 * `name?.split(" ")[0]` breaks for titles like "Dr. Sarah Chen" (yields
 * "Dr."), producing greetings such as "Welcome back, Dr." - this helper
 * skips common honorifics before picking the first real token.
 */
const HONORIFICS = new Set([
  "dr", "dr.", "prof", "prof.", "professor", "mr", "mr.", "mrs", "mrs.",
  "ms", "ms.", "miss", "sir", "madam", "dame", "mx", "mx.", "rev", "rev.",
])

export function firstNameFor(name?: string | null, fallback = "there"): string {
  if (!name?.trim()) return fallback
  const tokens = name.trim().split(/\s+/).filter(Boolean)
  let start = 0
  // Only strip honorifics while at least one token remains behind it.
  while (start < tokens.length - 1 && HONORIFICS.has(tokens[start].toLowerCase())) start++
  return tokens[start] || fallback
}
