import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const ALLOWED_EMAIL = 'afanuel@nsa.org.na'
const BACKUP_DIR = '/home/afanuel/backups/scheduled'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await execAsync(`mkdir -p ${BACKUP_DIR}`)

    const { stdout: lsOut } = await execAsync(
      `ls -lt ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null || echo ""`
    )

    const backups = lsOut.trim()
      ? lsOut.trim().split('\n').map(line => {
          const parts = line.trim().split(/\s+/)
          const size = parseInt(parts[4]) || 0
          const fullPath = parts[parts.length - 1]
          const filename = fullPath.split('/').pop() || ''
          const match = filename.match(/backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/)
          const createdAt = match
            ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
            : ''
          return { filename, size, createdAt }
        }).filter(b => b.filename)
      : []

    // Get cron schedule info
    const { stdout: cronOut } = await execAsync(
      `crontab -l 2>/dev/null | grep db-backup || echo ""`
    )
    const cronLine = cronOut.trim()
    const hasSchedule = cronLine !== ''
    let scheduleHour = '2'
    let scheduleMinute = '0'
    if (hasSchedule) {
      const m = cronLine.match(/^(\d+)\s+(\d+)/)
      if (m) { scheduleMinute = m[1]; scheduleHour = m[2] }
    }

    // Get last log entries
    const { stdout: logOut } = await execAsync(
      `tail -5 /home/afanuel/backups/backup.log 2>/dev/null || echo ""`
    )

    return NextResponse.json({
      success: true,
      backups,
      hasSchedule,
      cronLine,
      scheduleHour,
      scheduleMinute,
      recentLogs: logOut.trim(),
    })
  } catch (err: any) {
    console.error('[DB Backup] List error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
