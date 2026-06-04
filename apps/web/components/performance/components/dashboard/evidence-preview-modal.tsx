'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  FileSpreadsheet,
  File,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  X,
} from 'lucide-react'

//  helpers 

/** Parse evidenceUrl which may be a JSON array, a single URL, or a /uploads path */
export function parseEvidenceUrls(evidenceUrl: string | null | undefined): string[] {
  if (!evidenceUrl) return []
  const trimmed = evidenceUrl.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {}
  }
  return [trimmed]
}

type FileKind = 'image' | 'pdf' | 'word' | 'excel' | 'ppt' | 'text' | 'link' | 'file'

function getFileKind(url: string): FileKind {
  // External http/https URLs are always treated as links regardless of extension.
  // Office Online requires a publicly-accessible direct-download URL, which
  // SharePoint/OneDrive sharing links are NOT  they require authentication.
  // For external links, we just open them directly (SharePoint opens its own viewer).
  if (url.startsWith('http://') || url.startsWith('https://')) return 'link'

  // For locally-hosted files (/uploads/...) detect type by extension
  const lower = url.toLowerCase().split('?')[0]
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return 'image'
  if (/\.pdf$/.test(lower)) return 'pdf'
  if (/\.(doc|docx)$/.test(lower)) return 'word'
  if (/\.(xls|xlsx|csv)$/.test(lower)) return 'excel'
  if (/\.(ppt|pptx)$/.test(lower)) return 'ppt'
  if (/\.txt$/.test(lower)) return 'text'
  return 'file'
}

function getFileName(url: string): string {
  const raw = url.split('/').pop() ?? url
  return decodeURIComponent(raw.split('?')[0])
}

/** Rewrite legacy /uploads/evidence/ paths to the API-served route that works in production */
function resolveEvidenceUrl(url: string): string {
  if (url.startsWith('/uploads/evidence/')) {
    const filename = url.replace('/uploads/evidence/', '')
    return `/dashboard/performance/api/uploads/evidence/${filename}`
  }
  return url
}

function getAbsoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url
  if (url.startsWith('/')) return `${window.location.origin}${url}`
  return url
}

//  sub-components (link kind is handled inline in the preview pane)

//  sub-components 

function FileKindIcon({ kind, className = 'w-5 h-5' }: { kind: FileKind; className?: string }) {
  switch (kind) {
    case 'image':   return <ImageIcon className={`${className} text-green-600`} />
    case 'pdf':     return <FileText className={`${className} text-red-600`} />
    case 'word':    return <FileText className={`${className} text-blue-600`} />
    case 'excel':   return <FileSpreadsheet className={`${className} text-emerald-600`} />
    case 'ppt':     return <FileText className={`${className} text-orange-600`} />
    case 'link':    return <ExternalLink className={`${className} text-purple-600`} />
    case 'text':    return <FileText className={`${className} text-gray-600`} />
    default:        return <File className={`${className} text-gray-500`} />
  }
}

function kindLabel(kind: FileKind): string {
  switch (kind) {
    case 'image':   return 'Image'
    case 'pdf':     return 'PDF Document'
    case 'word':    return 'Word Document'
    case 'excel':   return 'Excel Spreadsheet'
    case 'ppt':     return 'PowerPoint Presentation'
    case 'link':    return 'External Link'
    case 'text':    return 'Text File'
    default:        return 'File'
  }
}

//  main component 

interface EvidencePreviewModalProps {
  evidenceUrl: string | null | undefined
  evidenceNotes?: string | null
  open: boolean
  onClose: () => void
  title?: string
}

export function EvidencePreviewModal({
  evidenceUrl,
  evidenceNotes,
  open,
  onClose,
  title = 'Evidence Preview',
}: EvidencePreviewModalProps) {
  const urls = parseEvidenceUrls(evidenceUrl).map(resolveEvidenceUrl)
  const [idx, setIdx] = useState(0)

  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open || !urls.length) return null

  const currentUrl = urls[Math.min(idx, urls.length - 1)]
  const kind = getFileKind(currentUrl)
  const fileName = getFileName(currentUrl)
  const absUrl = getAbsoluteUrl(currentUrl)
  const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absUrl)}`

  return (
    /* z-[9999] guarantees this renders above any z-50 fixed overlay/modal */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col gap-3 p-5 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between pb-0">
          <h2 className="text-base font-semibold flex items-center gap-2">
            {title}
            {urls.length > 1 && (
              <span className="text-sm font-normal text-gray-500">
                 file {idx + 1} of {urls.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab strip for multiple files */}
        {urls.length > 1 && (
          <div className="flex gap-1.5 flex-wrap border-b pb-2">
            {urls.map((u, i) => {
              const k = getFileKind(u)
              const fn = getFileName(u)
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors truncate max-w-[180px] ${
                    i === idx
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  <FileKindIcon kind={k} className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{fn}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* File info bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
            <FileKindIcon kind={kind} className="w-5 h-5 shrink-0" />
            <span className="font-medium truncate">{fileName}</span>
            <span className="text-xs text-gray-400 shrink-0 uppercase">{kindLabel(kind)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {kind !== 'link' && (
              <Button size="sm" variant="outline" asChild>
                <a href={currentUrl} download={fileName}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download
                </a>
              </Button>
            )}
            {kind === 'link' && (
              <Button size="sm" asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Link
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex-1 min-h-0 overflow-auto rounded-xl border bg-gray-50">

          {kind === 'image' && (
            <div className="flex items-center justify-center p-4 min-h-[360px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt={fileName}
                className="max-w-full max-h-[560px] object-contain rounded-lg shadow-md"
              />
            </div>
          )}

          {kind === 'pdf' && (
            <iframe
              src={currentUrl}
              className="w-full rounded-xl"
              style={{ height: 560 }}
              title={fileName}
            />
          )}

          {kind === 'text' && (
            <iframe
              src={currentUrl}
              className="w-full rounded-xl"
              style={{ height: 560 }}
              title={fileName}
            />
          )}

          {(kind === 'word' || kind === 'excel' || kind === 'ppt') && (
            <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center gap-4">
              <FileKindIcon kind={kind} className="w-16 h-16" />
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">{fileName}</h3>
                <p className="text-sm text-gray-500 mt-1">{kindLabel(kind)}</p>
              </div>
              <p className="text-sm text-gray-500 max-w-md">
                This file type cannot be previewed inline. Download it or open it in Microsoft Office Online.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button asChild>
                  <a href={currentUrl} download={fileName}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={officeViewerUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Office Online
                  </a>
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Office Online preview requires a public-facing server URL and internet access.
              </p>
            </div>
          )}

          {kind === 'link' && (
            <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center gap-4">
              <ExternalLink className="w-14 h-14 text-purple-500" />
              <div>
                <h3 className="font-semibold text-gray-800">External Link</h3>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 underline decoration-blue-400 break-all mt-2 max-w-lg inline-block cursor-pointer">{currentUrl}</a>
              </div>
              <Button asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </a>
              </Button>
              <p className="text-xs text-gray-400 max-w-md">
                This link will open in a new tab. If it is a SharePoint or OneDrive link, you will need to be signed in to view it.
              </p>
            </div>
          )}

          {kind === 'file' && (
            <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center gap-4">
              <File className="w-14 h-14 text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-800">{fileName}</h3>
                <p className="text-sm text-gray-500 mt-1">Preview not available for this file type.</p>
              </div>
              <Button asChild>
                <a href={currentUrl} download={fileName}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Evidence notes */}
        {evidenceNotes && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-gray-700">
            <span className="font-semibold text-amber-800">Notes: </span>
            {evidenceNotes}
          </div>
        )}

        {/* Navigation arrows for multiple files */}
        {urls.length > 1 && (
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-500">{idx + 1} / {urls.length}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdx(i => Math.min(urls.length - 1, i + 1))}
              disabled={idx === urls.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
