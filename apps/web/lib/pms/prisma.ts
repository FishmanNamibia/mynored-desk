import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('[Prisma] DATABASE_URL environment variable is not set!')
  console.error('[Prisma] Please create a .env.local file in apps/web with:')
  console.error('[Prisma] DATABASE_URL="<your_database_connection_string>"')
}

// Use a shared pg Pool and Prisma adapter — always cached on globalThis to prevent
// connection exhaustion from creating a new Pool on every Next.js module evaluation.
const pool: Pool = globalForPrisma.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

if (!globalForPrisma.pgPool) {
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[Prisma Pool] Unexpected error on idle client', err)
  })
  globalForPrisma.pgPool = pool
}

const adapter = new PrismaPg(pool)

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    adapter,
  })

// Always cache on globalThis — in production Next.js does NOT hot-reload so this
// is safe and prevents a new PrismaClient + Pool being created on every cold start.
globalForPrisma.prisma = prisma
