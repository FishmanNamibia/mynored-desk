import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { testid: string } }
) {
  return NextResponse.json({ 
    message: 'Dynamic test endpoint working', 
    id: params.testid,
    globalStorageExists: !!(global as any).requestStorage,
    storageLength: (global as any).requestStorage ? (global as any).requestStorage.length : 0
  })
}