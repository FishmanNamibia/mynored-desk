import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const ALLOWED_EMAIL = 'afanuel@nsa.org.na'
const BACKUP_DIR = '/home/afanuel/backups/scheduled'

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.email.toLowerCase() !== ALLOWED_EMAIL)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { filename } = body

    if (!filename || !/^backup_\d{8}_\d{6}\.sql\.gz$/.test(filename))
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

    await execAsync(`rm -f ${BACKUP_DIR}/${filename}`)
    await execAsync(`echo "[$(date)] Deleted backup: ${filename}" >> /home/afanuel/backups/backup.log`)

    return NextResponse.json({ success: true, message: `Deleted: ${filename}` })
  } catch (err: any) {
    console.error('[DB Backup] Delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
