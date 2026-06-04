import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    receivedId: params.id,
    idLength: params.id.length,
    idCharCodes: Array.from(params.id).map(c => c.charCodeAt(0)),
    paramsObject: params,
    url: req.url
  })
}