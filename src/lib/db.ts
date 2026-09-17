import { PrismaClient } from '@prisma/client'

function resolveDatabaseUrl(): string {
  const shellUrl = process.env.DATABASE_URL
  if (shellUrl && !shellUrl.startsWith('file:')) return shellUrl
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-development-server'
  if (process.env.NODE_ENV === 'production' && !isBuild) {
    throw new Error('DATABASE_URL missing or SQLite in production.')
  }
  if (typeof window !== 'undefined') { return shellUrl || '' }
  try {
    const g = globalThis as any; const r = g.require
    const fs = r('fs'), path = r('path')
    const ep = path.join(process.cwd(), '.env')
    if (fs.existsSync(ep)) {
      const m = fs.readFileSync(ep, 'utf-8').match(/^(?:export\s+)?DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)
      if (m && m[1] && !m[1].startsWith('file:')) return m[1]
    }
  } catch {}
  if (!shellUrl) throw new Error('DATABASE_URL not set')
  return shellUrl
}

const g = globalThis as any
export const db = g.prisma ?? new PrismaClient({ datasourceUrl: resolveDatabaseUrl(), log: process.env.NODE_ENV === 'production' ? ['error','warn'] : ['error','warn'] })
if (process.env.NODE_ENV !== 'production') g.prisma = db
