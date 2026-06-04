import nodemailer from 'nodemailer'
import { prisma } from '@/lib/pms/prisma'

const SMTP_PASSWORD = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || ''
if (!SMTP_PASSWORD) {
  console.warn('[EMAIL] No SMTP password set (SMTP_PASS / EMAIL_PASSWORD); outbound mail may fail.')
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'pms.nsa.org.na',
  port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465'),
  secure: (process.env.SMTP_SECURE ?? process.env.EMAIL_SECURE ?? 'true') !== 'false',
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@pms.nsa.org.na',
    pass: SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10s — fail fast if SMTP unreachable
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

const FROM_ADDRESS = process.env.EMAIL_FROM ||
  `"NSA Performance System" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@pms.nsa.org.na'}>`

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<void> {
  const recipients = Array.isArray(to) ? to.join(', ') : to
  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to: recipients, subject, html })
    console.log(`[EMAIL] Sent "${subject}" → ${recipients}`)
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${subject}" → ${recipients}:`, err)
    throw err
  }
}

export interface ManagerChainMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
}

export async function getManagerChain(
  userId: string,
  maxDepth = 10
): Promise<ManagerChainMember[]> {
  const chain: ManagerChainMember[] = []
  const visited = new Set<string>()
  let currentId = userId
  let depth = 0

  while (depth < maxDepth) {
    const record = await prisma.user.findUnique({
      where: { id: currentId },
      select: {
        managerId: true,
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
          },
        },
      },
    })

    if (!record?.manager || !record.managerId || visited.has(record.managerId)) break

    visited.add(record.managerId)
    chain.push(record.manager)
    currentId = record.managerId
    depth++
  }

  return chain
}

export function fullName(firstName: string | null, lastName: string | null, email?: string): string {
  const name = `${firstName || ''} ${lastName || ''}`.trim()
  return name || email || 'Unknown'
}
