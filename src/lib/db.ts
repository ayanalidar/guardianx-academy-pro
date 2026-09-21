import { PrismaClient } from '@prisma/client'

/**
 * Resolve DATABASE_URL with fallbacks for different environments.
 *
 * During `next build` on Vercel, DATABASE_URL may not be set (it's
 * often configured as a runtime-only env var). The build-time page-data
 * collection step imports API routes → db.ts → resolveDatabaseUrl().
 * If we throw, the build fails.
 *
 * Fix: during build, return a placeholder URL. PrismaClient is
 * instantiated but never actually connects during build - it's only
 * imported for module evaluation. At runtime, the real DATABASE_URL
 * is set by Vercel's environment.
 */
function resolveDatabaseUrl(): string {
  const shellUrl = process.env.DATABASE_URL

  // Case 1: Real PostgreSQL URL available - use it.
  if (shellUrl && !shellUrl.startsWith('file:')) {
    return shellUrl
  }

  // Case 2: Try reading from .env file (local dev - shell has SQLite fallback)
  if (typeof window !== 'undefined') {
    return shellUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
  }

  try {
    const g = globalThis as any
    const _require: NodeRequire = g.require
    const fs = _require('fs') as typeof import('fs')
    const path = _require('path') as typeof import('path')
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8')
      const match = content.match(/^(?:export\s+)?DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)
      if (match && match[1] && !match[1].startsWith('file:')) {
        return match[1]
      }
    }
  } catch {
    // ignore
  }

  // Case 3: No DATABASE_URL found anywhere.
  // - During build (Vercel/CI): return a placeholder so module evaluation
  //   doesn't crash. PrismaClient won't actually connect.
  // - At runtime in production: this means DATABASE_URL was never set,
  //   which is a deployment misconfiguration. The first DB query will fail
  //   with a clear Prisma connection error.
  if (process.env.NEXT_PHASE === 'phase-production-build' || !shellUrl) {
    // Return a placeholder - PrismaClient accepts any valid connection string
    // format. It won't connect until a query is actually run.
    return 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
  }

  // SQLite fallback (sandbox dev shell)
  return shellUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
