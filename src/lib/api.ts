"use client"

export async function api<T = any>(
  path: string,
  options?: RequestInit & { token?: string; timeoutMs?: number }
): Promise<T> {
  // Hard ceiling per request. WHY: fetch() alone can hang for minutes on a
  // stalled connection / frozen serverless instance, which kept views on
  // their loading skeletons forever ("content never loads until I
  // refresh"). Aborting surfaces a clean retryable failure to react-query,
  // which then retries and finally shows the error/empty state.
  const { timeoutMs = 15_000, token, ...rest } = options ?? {}
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(path, {
      ...rest,
      // Callers may pass their own signal - respect it over our timeout.
      signal: rest.signal ?? ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
      credentials: "include",
    })
    const text = await res.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        // A proxy/CDN error page (HTML) or corrupted body must surface as a
        // clean Request failed error, never a raw SyntaxError.
        throw new Error(res.ok ? "Invalid response from server" : `Request failed: ${res.status}`)
      }
    }
    if (!res.ok) {
      const err = new Error(data?.error || `Request failed: ${res.status}`) as Error & {
        status?: number
        body?: any
      }
      // Attach status + body so callers can react to specific codes
      // (e.g. 402 checkout-required enrollments) without string matching.
      err.status = res.status
      err.body = data
      throw err
    }
    return data as T
  } finally {
    clearTimeout(timer)
  }
}
