import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyNSADesk/1.0 (internal workplace app)' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ name: 'Your location' })
    }

    const data: any = await res.json()
    const addr = data.address || {}
    const name =
      addr.city || addr.town || addr.village || addr.county ||
      addr.state || addr.country || 'Your location'

    return NextResponse.json({ name })
  } catch {
    return NextResponse.json({ name: 'Your location' })
  }
}
