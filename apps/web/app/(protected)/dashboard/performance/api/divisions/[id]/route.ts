import { NextRequest, NextResponse } from 'next/server'

// Division model does not exist in the Prisma schema.
// Divisions are tracked via the divisionName string field on User (from Entra AD).
// These endpoints are placeholders for future use.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Division model not implemented' }, { status: 501 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Division model not implemented' }, { status: 501 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: 'Division model not implemented' }, { status: 501 })
}
