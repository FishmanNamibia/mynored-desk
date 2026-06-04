import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=5`;
    const response = await fetch(url, {
      headers: { "User-Agent": "NOREDDesk/1.0 (internal workplace app)" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data: any[] = await response.json();
    const results = data.map((item) => ({
      name: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
