import { type NextRequest, NextResponse } from "next/server"

const SHAREPOINT_HOST = "nsaorgna.sharepoint.com"
const SHAREPOINT_SITE_ID = "nsaorgna.sharepoint.com,90aaf013-5870-40de-b136-88d26bc398b0,9106bbfb-3812-44ea-96aa-a47cd634bf22"

// ── POST: Create a new notice (SitePage) in SharePoint ───────────────────────
export async function POST(req: NextRequest) {
  const spToken = req.headers.get("x-sp-token")
  if (!spToken) {
    return NextResponse.json({ error: "SharePoint token required to create notices" }, { status: 401 })
  }

  let body: { title?: string; description?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { title, description, content } = body
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const spHeaders = {
    Authorization: `Bearer ${spToken}`,
    Accept: "application/json;odata=nometadata",
    "Content-Type": "application/json;odata=nometadata",
  }

  // Build canvas HTML — wrap the body text in a basic rich-text web part structure
  const bodyText = (content?.trim() || description?.trim() || "").replace(/\n/g, "<br/>")
  const safeBody = bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // restore the <br/> we just escaped above
    .replace(/&lt;br\/&gt;/g, "<br/>")
  const canvasContent = `<div><p>${safeBody}</p></div>`

  try {
    // Step 1: Create the page via SharePoint REST /_api/sitepages/pages
    const createRes = await fetch(`https://${SHAREPOINT_HOST}/_api/sitepages/pages`, {
      method: "POST",
      headers: spHeaders,
      body: JSON.stringify({
        Title: title.trim(),
        BannerImageUrl: null,
        Description: description?.trim() || "",
        CanvasContent1: canvasContent,
        LayoutWebpartsContent: null,
        PageLayoutType: "Article",
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      console.error("[SharePoint Create Notice] create failed:", createRes.status, err.slice(0, 400))
      return NextResponse.json(
        { error: `SharePoint rejected the page creation (${createRes.status}). Check that your account has edit permissions on the site.` },
        { status: 502 },
      )
    }

    const pageData = await createRes.json()
    const pageId: number | undefined = pageData.Id ?? pageData.id

    if (!pageId) {
      return NextResponse.json({ error: "Page created but no ID was returned by SharePoint" }, { status: 502 })
    }

    // Step 2: Publish the page so it appears publicly
    const publishRes = await fetch(`https://${SHAREPOINT_HOST}/_api/sitepages/pages(${pageId})/publish`, {
      method: "POST",
      headers: spHeaders,
      body: "{}",
    })

    if (!publishRes.ok) {
      const err = await publishRes.text()
      console.warn("[SharePoint Create Notice] publish failed:", publishRes.status, err.slice(0, 200))
      // Page created but not published — still a partial success
      return NextResponse.json({ success: true, published: false, pageId })
    }

    console.log("[SharePoint Create Notice] created & published pageId:", pageId)
    return NextResponse.json({ success: true, published: true, pageId })
  } catch (err: any) {
    console.error("[SharePoint Create Notice] unexpected error:", err?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 })
  }

  const graphToken = authHeader.slice(7)

  const headers = {
    Authorization: `Bearer ${graphToken}`,
    Accept: "application/json",
  }

  // SharePoint-scoped token passed by widget for direct REST API access
  const spToken = req.headers.get("x-sp-token")

  try {
    // ── Path A: SharePoint REST API (most reliable for SitePages) ────────────
    if (spToken) {
      const spUrl =
        `https://${SHAREPOINT_HOST}/_api/web/lists/GetByTitle('Site Pages')/items` +
        `?$select=Title,FileLeafRef,FileRef,Created,Modified,Description0,EncodedAbsUrl` +
        `&$expand=FieldValuesAsText` +
        `&$orderby=Created desc` +
        `&$top=50` +
        `&$filter=FSObjType eq 0`  // files only, not folders

      const spRes = await fetch(spUrl, {
        headers: {
          Authorization: `Bearer ${spToken}`,
          Accept: "application/json;odata=nometadata",
        },
        cache: "no-store",
      })

      if (spRes.ok) {
        const spData = await spRes.json()
        const raw: any[] = spData.value ?? []
        console.log("[SharePoint Notices] SP REST items:", raw.length)
        if (raw.length > 0) {
          console.log("[SharePoint Notices] first SP item:", JSON.stringify(raw[0]).slice(0, 400))
        }
        return NextResponse.json({ notices: mapSpItems(raw) })
      }

      const spErr = await spRes.text()
      console.error("[SharePoint Notices] SP REST error", spRes.status, spErr.slice(0, 300))
      // Fall through to Graph search fallback
    }

    // ── Path B: Graph beta /pages API ────────────────────────────────────────
    // v1.0 pages returns 0 on some tenants; beta may return classic wiki pages
    const betaRes = await fetch(
      `https://graph.microsoft.com/beta/sites/${SHAREPOINT_SITE_ID}/pages?$top=50`,
      { headers, cache: "no-store" },
    )
    if (betaRes.ok) {
      const betaData = await betaRes.json()
      const betaPages: any[] = betaData.value ?? []
      console.log("[SharePoint Notices] beta pages count:", betaPages.length)
      if (betaPages.length > 0) {
        console.log("[SharePoint Notices] first beta page:", JSON.stringify(betaPages[0]).slice(0, 400))
        return NextResponse.json({ notices: mapDriveItems(betaPages, SHAREPOINT_HOST) })
      }
    } else {
      const betaErr = await betaRes.text()
      console.error("[SharePoint Notices] beta pages error", betaRes.status, betaErr.slice(0, 200))
    }

    // ── Path C: Try accessing list by display name "Site Pages" (with space) ────
    // Graph API /lists/{name} matches the URL name; try display name variants too
    // "Site%20Pages" found the list but $orderby=fields/Created fails → sort client-side
    for (const listName of ["Site%20Pages", "SitePages", "Site Pages"]) {
      const listRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_SITE_ID}/lists/${listName}/items` +
          `?$expand=fields($select=Title,FileLeafRef,FileRef,Description,Created,AuthorByline)` +
          `&$top=100`,
        { headers, cache: "no-store" },
      )
      if (listRes.ok) {
        const listData = await listRes.json()
        const items: any[] = listData.value ?? []
        console.log(`[SharePoint Notices] listName=${listName} items:`, items.length)
        if (items.length > 0) {
          console.log("[SharePoint Notices] first item:", JSON.stringify(items[0]).slice(0, 400))
          return NextResponse.json({ notices: mapListFieldItems(items, SHAREPOINT_HOST) })
        }
      } else {
        const errText = await listRes.text()
        console.log(`[SharePoint Notices] ${listName} → ${listRes.status}: ${errText.slice(0, 100)}`)
      }
    }

    // ── Path D: Search for the list entity to discover SitePages GUID ────────
    const listSearchRes = await fetch("https://graph.microsoft.com/v1.0/search/query", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          entityTypes: ["list"],
          query: { queryString: `"Site Pages" site:${SHAREPOINT_HOST}` },
          fields: ["id", "name", "displayName", "webUrl"],
          size: 50,
        }],
      }),
      cache: "no-store",
    })

    if (listSearchRes.ok) {
      const listSearchData = await listSearchRes.json()
      const listHits: any[] = listSearchData?.value?.[0]?.hitsContainers?.[0]?.hits ?? []
      console.log("[SharePoint Notices] list entity search hits:", listHits.length)

      // Collect pages from ALL accessible SitePages lists so every user sees the same pool
      const combinedItems: any[] = []
      const seenTitles = new Set<string>()

      for (const hit of listHits) {
        const r = hit.resource ?? hit
        const listId = r.id as string
        const listWebUrl = (r.webUrl as string | undefined) ?? ""
        if (!listId || !listWebUrl) continue

        // Extract sub-site path: ".../sites/TeamNSA/SitePages/..." → "/sites/TeamNSA"
        const sitePathMatch = listWebUrl.match(
          new RegExp(`^https?://${SHAREPOINT_HOST}(/sites/[^/]+)`),
        )
        const sitePath = sitePathMatch ? sitePathMatch[1] : ""
        const siteRef = sitePath ? `${SHAREPOINT_HOST}:${sitePath}:` : SHAREPOINT_SITE_ID

        const itemsRes = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteRef}/lists/${listId}/items` +
            `?$expand=fields($select=Title,FileLeafRef,FileRef,Description,Created,AuthorByline)` +
            `&$top=50`,
          { headers, cache: "no-store" },
        )
        if (!itemsRes.ok) continue

        const itemsData = await itemsRes.json()
        const items: any[] = itemsData.value ?? []

        for (const item of items) {
          const f = item.fields ?? {}
          const title = ((f.Title as string) || "").trim()
          const fileLeafRef = ((f.FileLeafRef as string) || "").toLowerCase()
          const authorByline = f.AuthorByline
          const authorStr = Array.isArray(authorByline)
            ? authorByline.join(",").toLowerCase()
            : String(authorByline ?? "").toLowerCase()

          // Skip system/default pages: "Home" page, pages by System Account,
          // pages with dummy filenames like Page(1).aspx
          if (DUMMY_PAGE_RE.test(fileLeafRef.replace(/\.aspx$/i, ""))) continue
          if (title.toLowerCase() === "home") continue
          if (authorStr.includes("system account")) continue
          if (!title && !fileLeafRef) continue

          // Deduplicate by title (same notice may appear across sites)
          const dedupKey = (title || fileLeafRef).toLowerCase()
          if (seenTitles.has(dedupKey)) continue
          seenTitles.add(dedupKey)

          combinedItems.push(item)
        }
      }

      console.log("[SharePoint Notices] combined unique items:", combinedItems.length)
      if (combinedItems.length > 0) {
        return NextResponse.json({ notices: mapListFieldItems(combinedItems, SHAREPOINT_HOST) })
      }
    }

    return NextResponse.json({ notices: [] })
  } catch (err: any) {
    console.error("[SharePoint Notices] Unexpected error", err?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** Maps Graph API list items (from /sites/{id}/lists/{id}/items?$expand=fields) */
function mapListFieldItems(items: any[], host: string) {
  return items
    .map((item: any) => {
      const f = item.fields ?? {}
      const fileLeafRef = (f.FileLeafRef as string | undefined) ?? ""
      const baseName = fileLeafRef.replace(/\.aspx$/i, "")
      const rawTitle = (f.Title as string | undefined) ?? ""
      const displayTitle = rawTitle.trim() || slugToTitle(baseName)
      return { ...item, _displayTitle: displayTitle, _baseName: baseName }
    })
    .filter((item: any) => item._baseName && !DUMMY_PAGE_RE.test(item._baseName))
    .sort((a: any, b: any) => {
      const tA = new Date(a.fields?.Created || a.createdDateTime || 0).getTime()
      const tB = new Date(b.fields?.Created || b.createdDateTime || 0).getTime()
      return tB - tA
    })
    .slice(0, 20)
    .map((item: any) => {
      const f = item.fields ?? {}
      const rawDate = (f.Created as string | undefined) || (item.createdDateTime as string | undefined) || ""
      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : ""

      const authorByline = f.AuthorByline as string[] | string | undefined
      const author = Array.isArray(authorByline)
        ? authorByline.join(", ")
        : (authorByline as string | undefined) ?? (item.createdBy?.user?.displayName ?? "")

      const fileRef = (f.FileRef as string | undefined) ?? ""
      const pageUrl = fileRef ? `https://${host}${fileRef}` : item.webUrl ?? `https://${host}/SitePages`

      return {
        id: String(item.id ?? Math.random()),
        title: item._displayTitle as string,
        description: (f.Description as string) || "",
        date: formattedDate,
        author,
        url: pageUrl,
        isNews: false,
        bannerImage: null,
      }
    })
}

/** Maps SharePoint REST API list items (from /_api/web/lists/.../items) to notices */
function mapSpItems(items: any[]) {
  return items
    .map((item: any) => {
      const fileLeafRef = (item.FileLeafRef as string | undefined) ?? ""
      const baseName = fileLeafRef.replace(/\.aspx$/i, "")
      const rawTitle = (item.Title as string | undefined) ?? ""
      const displayTitle = rawTitle.trim() || slugToTitle(baseName)
      return { ...item, _displayTitle: displayTitle, _baseName: baseName }
    })
    .filter((item: any) => item._baseName && !DUMMY_PAGE_RE.test(item._baseName))
    // REST API already ordered by Created desc — no re-sort needed, but keep top 20
    .slice(0, 20)
    .map((item: any) => {
      const rawDate = (item.Created as string | undefined) || (item.Modified as string | undefined) || ""
      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : ""

      // Author from FieldValuesAsText or Author field
      const author =
        (item.FieldValuesAsText?.Author as string | undefined) ??
        (item.Author?.Title as string | undefined) ??
        ""

      const fileRef = (item.FileRef as string | undefined) ?? ""
      const pageUrl = fileRef
        ? `https://${SHAREPOINT_HOST}${fileRef}`
        : (item.EncodedAbsUrl as string | undefined) ?? `https://${SHAREPOINT_HOST}/SitePages`

      return {
        id: String(item.Id ?? item.ID ?? Math.random()),
        title: item._displayTitle as string,
        description: (item.Description0 as string) || "",
        date: formattedDate,
        author,
        url: pageUrl,
        isNews: false,
        bannerImage: null,
      }
    })
}

/** Dummy page pattern: Page(1).aspx, Page(36), etc. */
const DUMMY_PAGE_RE = /^page\s*\(\s*\d+\s*\)$/i

/** "Team-Building-Activity" → "Team Building Activity" */
function slugToTitle(name: string): string {
  return name
    .replace(/\.aspx$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function mapDriveItems(files: any[], _host: string) {
  return files
    .map((f: any) => {
      // DriveItem uses f.name; listItem uses f.fields?.FileLeafRef
      const rawName =
        (f.name as string | undefined) ??
        (f.fields?.FileLeafRef as string | undefined) ??
        (f.fields?.fileLeafRef as string | undefined) ??
        ""
      const rawTitle =
        (f.title as string | undefined) ??
        (f.fields?.Title as string | undefined) ??
        (f.fields?.title as string | undefined) ??
        ""
      const baseName = rawName.replace(/\.aspx$/i, "")
      const displayTitle = rawTitle.trim() || slugToTitle(baseName)
      return { ...f, _displayTitle: displayTitle, _baseName: baseName }
    })
    // Filter out dummy auto-named pages like Page(1), Page(36)
    .filter((f: any) => f._baseName && !DUMMY_PAGE_RE.test(f._baseName))
    // Newest-first by createdDateTime
    .sort((a: any, b: any) => {
      const tA = new Date(a.createdDateTime || a.lastModifiedDateTime || 0).getTime()
      const tB = new Date(b.createdDateTime || b.lastModifiedDateTime || 0).getTime()
      return tB - tA
    })
    .slice(0, 20)
    .map((f: any) => {
      const rawDate = (f.createdDateTime as string | undefined) || (f.lastModifiedDateTime as string | undefined) || ""
      const formattedDate = rawDate
        ? new Date(rawDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : ""

      const author = (f.createdBy?.user?.displayName as string | undefined) ?? ""
      const pageUrl = (f.webUrl as string | undefined) ?? ""

      return {
        id: f.id as string,
        title: f._displayTitle as string,
        description: (f.description as string) || "",
        date: formattedDate,
        author,
        url: pageUrl,
        isNews: false,
        bannerImage: null,
      }
    })
}
