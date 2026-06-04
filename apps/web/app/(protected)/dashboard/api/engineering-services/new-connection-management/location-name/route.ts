import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
    const response = await fetch(url, {
      headers: { "User-Agent": "NOREDDesk/1.0 (internal workplace app)" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ name: "Selected location" });
    }

    const data: any = await response.json();
    const address = data.address || {};
    const name =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.state ||
      address.country ||
      data.display_name ||
      "Selected location";

    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ name: "Selected location" });
  }
}
