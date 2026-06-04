import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)
const ALLOWED_EMAIL = 'afanuel@nsa.org.na'
const BACKUP_DIR = '/home/afanuel/backups/scheduled'
const SCRIPT_PATH = '/home/afanuel/scripts/db-backup.sh'

function parseDbUrl() {
  const url = process.env.DATABASE_URL || ''
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
  if (!match) throw new Error('Cannot parse DATABASE_URL')
  return { user: match[1], password: match[2], host: match[3], port: match[4], database: match[5] }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { stdout } = await execAsync(`crontab -l 2>/dev/null | grep db-backup || echo ""`)
    const cronLine = stdout.trim()
    const active = cronLine !== ''
    let hour = '2'
    let minute = '0'
    if (active) {
      const m = cronLine.match(/^(\d+)\s+(\d+)/)
      if (m) { minute = m[1]; hour = m[2] }
    }
    return NextResponse.json({ active, cronLine, hour, minute })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { hour = 2, minute = 0, enabled = true, retentionDays = 10 } = await req.json()

    const db = parseDbUrl()

    // Write backup script to a temp file, then copy to server path
    const scriptContent = [
      '#!/bin/bash',
      `BACKUP_DIR="${BACKUP_DIR}"`,
      `export PGPASSWORD="${db.password}"`,
      'mkdir -p "$BACKUP_DIR"',
      'TIMESTAMP=$(date +%Y%m%d_%H%M%S)',
      `FILENAME="backup_\${TIMESTAMP}.sql.gz"`,
      `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} | gzip > "$BACKUP_DIR/$FILENAME"`,
      `find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +${retentionDays} -delete`,
      `echo "[\$(date)] Scheduled backup: \$FILENAME" >> /home/afanuel/backups/backup.log`,
    ].join('\n')

    // Write to temp file then move to destination
    const tmpFile = join(tmpdir(), 'db-backup.sh')
    await writeFile(tmpFile, scriptContent, 'utf8')
    await execAsync(`mkdir -p /home/afanuel/scripts`)
    await execAsync(`cp ${tmpFile} ${SCRIPT_PATH} && chmod +x ${SCRIPT_PATH}`)

    // Update crontab
    const { stdout: currentCron } = await execAsync(`crontab -l 2>/dev/null || echo ""`)
    const filtered = currentCron.split('\n')
      .filter(l => l.trim() !== '' && !l.includes('db-backup'))
      .join('\n')
      .trim()

    if (enabled) {
      const newLine = `${minute} ${hour} * * * ${SCRIPT_PATH} >> /home/afanuel/backups/backup.log 2>&1`
      const newCron = filtered ? `${filtered}\n${newLine}` : newLine
      // Write to temp file then apply
      const tmpCron = join(tmpdir(), 'mycron')
      await writeFile(tmpCron, newCron + '\n', 'utf8')
      await execAsync(`crontab ${tmpCron}`)
    } else {
      const tmpCron = join(tmpdir(), 'mycron')
      await writeFile(tmpCron, filtered ? filtered + '\n' : '\n', 'utf8')
      await execAsync(`crontab ${tmpCron}`)
    }

    const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    return NextResponse.json({
      success: true,
      message: enabled
        ? `Daily backup scheduled at ${displayTime} with ${retentionDays}-day retention`
        : 'Scheduled backup disabled',
    })
  } catch (err: any) {
    console.error('[DB Backup] Schedule error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { stdout: currentCron } = await execAsync(`crontab -l 2>/dev/null || echo ""`)
    const filtered = currentCron.split('\n')
      .filter(l => l.trim() !== '' && !l.includes('db-backup'))
      .join('\n')
      .trim()
    const tmpCron = join(tmpdir(), 'mycron')
    await writeFile(tmpCron, filtered ? filtered + '\n' : '\n', 'utf8')
    await execAsync(`crontab ${tmpCron}`)

    return NextResponse.json({ success: true, message: 'Scheduled backup disabled' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
