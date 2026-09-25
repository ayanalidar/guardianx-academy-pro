/**
 * GuardianX - ZAI chat-client resolver.
 *
 * WHY THIS EXISTS: `z-ai-web-dev-sdk`'s `ZAI.create()` reads credentials from
 * a `.z-ai-config` FILE (project dir → home dir → /etc). Vercel serverless
 * functions have no such file, so every AI route 500s with
 * "Configuration file not found" in production.
 *
 * This resolver (in priority order):
 *   1. Env vars ZAI_BASE_URL + ZAI_API_KEY → constructs the client directly
 *      (bypasses the file lookup entirely - set these in Vercel env to get
 *      full LLM generation in production).
 *   2. ZAI.create() - works wherever a config file exists (local dev, sandbox).
 *   3. Returns null - callers MUST degrade (use the built-in generator or a
 *      friendly 503), never leak a raw 500.
 */

export interface ChatClient {
  chat: {
    completions: {
      // Body typed loosely - the SDK's own body types are stricter than the
      // call sites need (roles, thinking, model overrides).
      create: (body: any) => Promise<any>
    }
  }
}

export async function getChatClient(): Promise<ChatClient | null> {
  // 1) Env-var credentials (production path - Vercel env vars)
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY
  if (baseUrl && apiKey) {
    try {
      const mod = await import("z-ai-web-dev-sdk")
      // The SDK's constructor is typed `private` but is public at runtime - 
      // constructing directly skips loadConfig()'s file-system requirement.
      const Ctor = mod.default as unknown as new (cfg: Record<string, string>) => ChatClient
      return new Ctor({ baseUrl, apiKey })
    } catch (e) {
      console.error("[zai] env-config client construction failed:", (e as Error)?.message)
    }
  }

  // 2) Classic file-based config (dev / sandbox)
  try {
    const mod = await import("z-ai-web-dev-sdk")
    return await mod.default.create()
  } catch (e) {
    console.error("[zai] no AI credentials available:", (e as Error)?.message)
  }

  // 3) Not configured
  return null
}

/** Human-readable hint for admins when AI credentials are missing. */
export const AI_NOT_CONFIGURED_HINT =
  "AI service is not configured on this deployment. " +
  "Set ZAI_BASE_URL and ZAI_API_KEY in the deployment environment variables " +
  "(or place a .z-ai-config file on the server). Until then the built-in " +
  "GuardianX knowledge generator is used."
