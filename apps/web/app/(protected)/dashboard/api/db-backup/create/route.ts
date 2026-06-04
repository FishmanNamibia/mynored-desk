import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const ALLOWED_EMAIL = 'afanuel@nsa.org.na'
export const BACKUP_DIR = '/home/afanuel/backups/scheduled'

function parseDbUrl() {
  const url = process.env.DATABASE_URL || ''
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
  if (!match) throw new Error('Cannot parse DATABASE_URL')
  return { user: match[1], password: match[2], host: match[3], port: match[4], database: match[5] }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden: restricted to system administrator only' }, { status: 403 })

    const db = parseDbUrl()
    await execAsync(`mkdir -p ${BACKUP_DIR}`)

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    const filename = `backup_${ts}.sql.gz`
    const filepath = `${BACKUP_DIR}/${filename}`

    const cmd = `PGPASSWORD='${db.password}' pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} | gzip > ${filepath}`
    await execAsync(cmd, { timeout: 180000 })

    const { stdout: szOut } = await execAsync(`stat -c%s ${filepath} 2>/dev/null || echo 0`)
    const size = parseInt(szOut.trim()) || 0

    // Log the backup
    await execAsync(`echo "[$(date)] Manual backup created: ${filename} (${size} bytes)" >> /home/afanuel/backups/backup.log`)

    return NextResponse.json({ success: true, filename, size, createdAt: now.toISOString() })
  } catch (err: any) {
    console.error('[DB Backup] Create error:', err)
    return NextResponse.json({ error: err.message || 'Backup failed' }, { status: 500 })
  }
}
