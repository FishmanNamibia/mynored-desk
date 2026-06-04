import { type NextRequest, NextResponse } from "next/server"

/**
 * Proxy endpoint for fetching Events, Birthdays, and Notices from the NSA SharePoint site.
 *
 * Expects a delegated Graph token with Sites.Read.All in the Authorization header.
 *
 * Query params:
 *   ?month=3   — filter birthdays to only those in the given month (1-12)
 *
 * The SharePoint site hostname is derived from the well-known NSA URL:
 *   https://nsaorgna.sharepoint.com  →  nsaorgna.sharepoint.com
 *
 * We search for lists named "Events", "Birthdays", and "Notices"/"News" on the
 * root site. If your tenant stores them under a different site path (e.g.
 * /sites/Intranet), set the SHAREPOINT_SITE_PATH env var accordingly.
 */

const SP_HOST = process.env.SHAREPOINT_HOST || "nsaorgna.sharepoint.com"
const SP_SITE_PATH = process.env.SHAREPOINT_SITE_PATH || ""  // e.g. "/sites/Intranet"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 })
  }

  const graphToken = authHeader.slice(7)
  const headers = {
    Authorization: `Bearer ${graphToken}`,
    "Content-Type": "application/json",
  }

  // Optional month filter for birthdays (1-12)
  const monthParam = req.nextUrl.searchParams.get("month")
  const filterMonth = monthParam ? parseInt(monthParam, 10) : null

  const siteId = await resolveSiteId(headers)

  const [events, allBirthdays, notices] = await Promise.all([
    fetchListItems(siteId, "Events", headers),
    fetchListItems(siteId, "Birthdays", headers),
    fetchNotices(siteId, headers),
  ])

  // Filter birthdays by month if requested
  let birthdays = allBirthdays
  if (filterMonth && filterMonth >= 1 && filterMonth <= 12) {
    birthdays = allBirthdays.filter((item) => {
      const dateStr = String(
        item.Birthday ?? item.Date ?? item.BirthDate ?? item.Birth_x0020_Date ?? ""
      )
      if (!dateStr) return false
      try {
        const d = new Date(dateStr)
        return d.getMonth() + 1 === filterMonth
      } catch {
        return false
      }
    })
  }

  return NextResponse.json({ events, birthdays, notices })
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function resolveSiteId(
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const siteUrl = SP_SITE_PATH
      ? `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:${SP_SITE_PATH}`
      : `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:/`

    const res = await fetch(siteUrl, { headers, cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    return data.id ?? null
  } catch {
    return null
  }
}

interface SPListItem {
  id: string
  fields: Record<string, unknown>
}

async function fetchListItems(
  siteId: string | null,
  listName: string,
  headers: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  if (!siteId) return []

  try {
    const url =
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${encodeURIComponent(listName)}/items` +
      `?expand=fields&$top=50&$orderby=fields/EventDate desc`

    const res = await fetch(url, { headers, cache: "no-store" })
    if (!res.ok) return []

    const data = await res.json()
    const items: SPListItem[] = data.value ?? []

    return items.map((item) => ({
      id: item.id,
      ...item.fields,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch notices / announcements from SharePoint.
 *
 * Tries common list names: "Notices", "News", "Announcements", "SitePages".
 * Returns the first list that resolves.
 */
async function fetchNotices(
  siteId: string | null,
  headers: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  if (!siteId) return []

  const candidateNames = ["Notices", "News", "Announcements"]

  for (const listName of candidateNames) {
    try {
      const url =
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${encodeURIComponent(listName)}/items` +
        `?expand=fields&$top=20&$orderby=fields/Created desc`

      const res = await fetch(url, { headers, cache: "no-store" })
      if (!res.ok) continue

      const data = await res.json()
      const items: SPListItem[] = data.value ?? []

      if (items.length > 0) {
        return items.map((item) => ({
          id: item.id,
          ...item.fields,
        }))
      }
    } catch {
      continue
    }
  }

  return []
}
