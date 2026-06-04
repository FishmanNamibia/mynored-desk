import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const ALLOWED_EMAIL = 'afanuel@nsa.org.na'
const BACKUP_DIR = '/home/afanuel/backups/scheduled'

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

    const body = await req.json()
    const { filename } = body

    if (!filename || !/^backup_\d{8}_\d{6}\.sql\.gz$/.test(filename))
      return NextResponse.json({ error: 'Invalid or missing filename' }, { status: 400 })

    const filepath = `${BACKUP_DIR}/${filename}`

    // Verify file exists
    await execAsync(`test -f ${filepath}`)

    const db = parseDbUrl()
    const cmd = `PGPASSWORD='${db.password}' gunzip -c ${filepath} | psql -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database}`
    await execAsync(cmd, { timeout: 300000 })

    await execAsync(`echo "[$(date)] Database restored from: ${filename}" >> /home/afanuel/backups/backup.log`)

    return NextResponse.json({ success: true, message: `Database successfully restored from ${filename}` })
  } catch (err: any) {
    console.error('[DB Backup] Restore error:', err)
    return NextResponse.json({ error: err.message || 'Restore failed' }, { status: 500 })
  }
}
