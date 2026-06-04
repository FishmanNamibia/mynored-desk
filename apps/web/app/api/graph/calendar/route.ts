import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 })
  }

  const graphToken = authHeader.slice(7)

  // Build today's date range in ISO 8601 format (local midnight → next midnight)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const startDateTime = startOfDay.toISOString()
  const endDateTime   = endOfDay.toISOString()

  const select = [
    "id",
    "subject",
    "start",
    "end",
    "location",
    "isOnlineMeeting",
    "onlineMeetingProvider",
    "onlineMeeting",
    "bodyPreview",
    "showAs",
    "isCancelled",
  ].join(",")

  const graphUrl =
    `https://graph.microsoft.com/v1.0/me/calendarView` +
    `?startDateTime=${encodeURIComponent(startDateTime)}` +
    `&endDateTime=${encodeURIComponent(endDateTime)}` +
    `&$select=${encodeURIComponent(select)}` +
    `&$orderby=${encodeURIComponent("start/dateTime asc")}` +
    `&$top=20`

  try {
    const graphRes = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${graphToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!graphRes.ok) {
      const text = await graphRes.text()
      console.error("[Graph Calendar] Graph API error", graphRes.status, text.slice(0, 400))
      return NextResponse.json(
        { error: "Graph API error", status: graphRes.status },
        { status: graphRes.status },
      )
    }

    const data = await graphRes.json()

    // Normalise into a simple shape the widget can consume
    const meetings = (data.value ?? [])
      .filter((e: any) => e.isCancelled !== true && e.showAs !== "free")
      .map((e: any) => {
        const startDt  = new Date(e.start?.dateTime + "Z")
        const endDt    = new Date(e.end?.dateTime + "Z")
        const durationMs = endDt.getTime() - startDt.getTime()
        const durationMin = Math.round(durationMs / 60000)

        let duration = ""
        if (durationMin < 60) {
          duration = `${durationMin} min`
        } else {
          const h = Math.floor(durationMin / 60)
          const m = durationMin % 60
          duration = m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`
        }

        const isOnline =
          e.isOnlineMeeting ||
          e.onlineMeetingProvider === "teamsForBusiness" ||
          e.onlineMeetingProvider === "skypeForBusiness"

        const location = isOnline
          ? "MS Teams"
          : (e.location?.displayName || "No location")

        return {
          id: e.id,
          title: e.subject || "(No title)",
          time: startDt.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Africa/Windhoek",
          }),
          duration,
          location,
          isOnline,
          joinUrl: e.onlineMeeting?.joinUrl ?? null,
          startIso: e.start?.dateTime,
        }
      })

    return NextResponse.json({ meetings })
  } catch (err: any) {
    console.error("[Graph Calendar] Unexpected error", err?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
