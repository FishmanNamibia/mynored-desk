import { NextRequest } from 'next/server'
import { GET as handler } from '@/app/(protected)/dashboard/performance/api/dashboard/level-stats/route'

export async function GET(req: NextRequest) {
  return handler(req)
}
