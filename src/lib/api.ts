"use client"

export async function api<T = any>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
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
}
