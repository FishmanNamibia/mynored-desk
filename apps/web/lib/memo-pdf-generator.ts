import jsPDF from 'jspdf'
import type { Memo } from '@/types/memo.types'
import { formatCurrency } from './memo-helpers'

// Company Details
const COMPANY_INFO = {
  name: 'NSA',
  address: [
    'Mutual Platz Building',
    '6958 Post Street Mall',
    'P. O. Box 2133',
    'Windhoek',
    'Namibia',
  ],
  contact: [
    'Tel: +264 61 431 3200',
    'Email: info@nsa.org.na',
    'Web: www.nsa.org.na',
  ],
}

// Board of Directors footer content
const BOARD_MEMBERS_LINE1 =
  'Mr. Justus Tjituka (Chairperson)  •  Ms. Ndiyakupi Nghishwamata (Vice-Chairperson)  •  Ms. Julia Muetudhana  •  Ms. Damoline Muruko'
const BOARD_MEMBERS_LINE2 =
  'Mr. Victor Ngiilimulwa  •  Mr. Alex Shimuafeni (Statistician-General & CEO)  •  Ms. Rauna Shipiki (Company Secretary)'

// Colors
const DARK_GOLD: [number, number, number] = [184, 134, 11] // #B8860B
const FADED_GRAY: [number, number, number] = [80, 80, 80]
const BLACK: [number, number, number] = [0, 0, 0]
const DIVIDER_GRAY: [number, number, number] = [100, 100, 100]

// A4 dimensions in mm
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

/**
 * Load the NSA logo as a base64 PNG data URL.
 * Falls back to null if loading fails.
 */
async function loadLogoImage(): Promise<string | null> {
  try {
    const response = await fetch('/nored-logo.svg')
    const svgText = await response.text()
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.src = url

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load logo'))
      setTimeout(() => reject(new Error('Logo load timeout')), 5000)
    })

    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return null
    }

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, 300, 320)
    const dataUrl = canvas.toDataURL('image/png')

    URL.revokeObjectURL(url)
    return dataUrl
  } catch (error) {
    console.error('Error loading NSA logo for PDF:', error)
    return null
  }
}

/**
 * Add the board-of-directors footer to a single page.
 */
function addFooter(doc: jsPDF) {
  const footerStartY = PAGE_HEIGHT - 25

  // "Board of Directors" heading in dark gold
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK_GOLD)
  doc.text('Board of Directors', MARGIN, footerStartY)

  // Board members in faded gray
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...FADED_GRAY)
  doc.text(BOARD_MEMBERS_LINE1, MARGIN, footerStartY + 4)
  doc.text(BOARD_MEMBERS_LINE2, MARGIN, footerStartY + 8)

  // Reset text color
  doc.setTextColor(...BLACK)
}

/**
 * Check if we need a new page and add one if so.
 * Returns the updated Y position.
 */
function ensureSpace(doc: jsPDF, currentY: number, requiredSpace: number): number {
  // Leave room for the footer (25mm from bottom)
  const maxY = PAGE_HEIGHT - 35
  if (currentY + requiredSpace > maxY) {
    doc.addPage()
    return 30
  }
  return currentY
}

/**
 * Generate a professional NSA memorandum PDF.
 *
 * @param memo - The memo data (matches the Memo type from the app)
 * @param preview - If true, opens in a new browser tab; otherwise downloads
 */
export async function generateMemoPDF(memo: Memo, preview = false): Promise<void> {
  const doc = new jsPDF('portrait', 'mm', 'a4')

  // Set document metadata
  doc.setProperties({
    title: memo.subject || 'NSA Memorandum',
    subject: 'Official Memorandum',
    author: 'Namibia Statistics Agency',
    creator: 'NSA Memo System',
  })

  // ── Logo ──────────────────────────────────────────────────────────────
  const logoData = await loadLogoImage()
  if (logoData) {
    doc.addImage(logoData, 'PNG', MARGIN, 15, 30, 32)
  }

  // ── Company info under logo (dark gold) ───────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK_GOLD)

  let companyYPos = 52
  COMPANY_INFO.address.forEach((line) => {
    doc.text(line, MARGIN, companyYPos)
    companyYPos += 4
  })

  companyYPos += 3
  COMPANY_INFO.contact.forEach((line) => {
    doc.text(line, MARGIN, companyYPos)
    companyYPos += 4
  })

  // ── Routing details (right of logo) ───────────────────────────────────
  doc.setTextColor(...BLACK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  let memoYPos = 20
  const routingX = 60
  const valueX = routingX + 30

  // TO
  if (memo.memoTo) {
    const toText = memo.memoToTitle
      ? `${memo.memoTo}, ${memo.memoToTitle}`
      : memo.memoTo
    doc.setFont('helvetica', 'bold')
    doc.text('TO:', routingX, memoYPos)
    doc.setFont('helvetica', 'normal')
    doc.text(toText, valueX, memoYPos)
    memoYPos += 10
  }

  // THROUGH
  if (memo.memoThrough && memo.memoThrough.length > 0) {
    memo.memoThrough.forEach((through) => {
      const parts = [through.name]
      if (through.title) parts.push(through.title)
      if ((through as any).department) parts.push((through as any).department)
      const throughText = parts.join(', ')
      if (throughText.trim()) {
        doc.setFont('helvetica', 'bold')
        doc.text('THROUGH:', routingX, memoYPos)
        doc.setFont('helvetica', 'normal')
        doc.text(throughText, valueX, memoYPos)
        memoYPos += 10
      }
    })
  }

  // FROM
  if (memo.memoFrom || memo.memoFromTitle) {
    const fromText = memo.memoFromTitle
      ? `${memo.memoFrom}, ${memo.memoFromTitle}`
      : memo.memoFrom
    doc.setFont('helvetica', 'bold')
    doc.text('FROM:', routingX, memoYPos)
    doc.setFont('helvetica', 'normal')
    doc.text(fromText || 'Management', valueX, memoYPos)
    memoYPos += 10
  }

  // DATE
  const displayDate = memo.memoDate
    ? new Date(memo.memoDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

  doc.setFont('helvetica', 'bold')
  doc.text('DATE:', routingX, memoYPos)
  doc.setFont('helvetica', 'normal')
  doc.text(displayDate, valueX, memoYPos)
  memoYPos += 15

  // SUBJECT
  doc.setFont('helvetica', 'bold')
  doc.text('SUBJECT:', routingX, memoYPos)
  doc.setFont('helvetica', 'normal')
  const subjectLines = doc.splitTextToSize(memo.subject || '', PAGE_WIDTH - valueX - 20)
  doc.text(subjectLines, valueX, memoYPos)
  memoYPos += subjectLines.length * 6 + 10

  // ── Divider line ──────────────────────────────────────────────────────
  let contentStartY = Math.max(companyYPos, memoYPos) + 5
  doc.setDrawColor(...DIVIDER_GRAY)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, contentStartY, PAGE_WIDTH - MARGIN, contentStartY)
  contentStartY += 10

  // ── 1. PURPOSE ────────────────────────────────────────────────────────
  contentStartY = ensureSpace(doc, contentStartY, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('1. PURPOSE', MARGIN, contentStartY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  contentStartY += 8

  const purposeText = memo.purpose || ''
  const purposeLines = doc.splitTextToSize(purposeText, CONTENT_WIDTH)
  contentStartY = ensureSpace(doc, contentStartY, purposeLines.length * 5)
  doc.text(purposeLines, MARGIN, contentStartY)
  contentStartY += purposeLines.length * 5 + 6

  // ── 2. FINANCIAL IMPLICATION ──────────────────────────────────────────
  const hasFinancialData =
    memo.procurementActivity ||
    memo.budgetVote ||
    memo.budgetedAmount ||
    memo.amountSpent ||
    memo.availableFunds

  if (hasFinancialData) {
    contentStartY = ensureSpace(doc, contentStartY, 80)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('2. FINANCIAL IMPLICATION', MARGIN, contentStartY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    contentStartY += 8

    if (memo.procurementActivity) {
      doc.text(`a) Procurement Activity: ${memo.procurementActivity}`, MARGIN, contentStartY)
      contentStartY += 6
    }
    if (memo.budgetVote) {
      doc.text(`b) Budget Vote: ${memo.budgetVote}`, MARGIN, contentStartY)
      contentStartY += 6
    }
    if (memo.budgetedAmount !== null && memo.budgetedAmount !== undefined) {
      doc.text(`c) Budgeted Amount: ${formatCurrency(memo.budgetedAmount)}`, MARGIN, contentStartY)
      contentStartY += 6
    }
    if (memo.amountSpent !== null && memo.amountSpent !== undefined) {
      doc.text(`d) Amount Spent: ${formatCurrency(memo.amountSpent)}`, MARGIN, contentStartY)
      contentStartY += 6
    }
    if (memo.availableFunds !== null && memo.availableFunds !== undefined) {
      doc.text(`e) Available Funds: ${formatCurrency(memo.availableFunds)}`, MARGIN, contentStartY)
      contentStartY += 8
    }

    // Executive approval section
    contentStartY = ensureSpace(doc, contentStartY, 50)
    doc.text('Position: Executive Finance and Administration', MARGIN, contentStartY)
    contentStartY += 8

    doc.text(
      `Executive Name: ${memo.executiveName || '_________________________________'}`,
      MARGIN,
      contentStartY,
    )
    contentStartY += 8

    const verificationText =
      memo.financialVerification === 'Yes' || memo.financialVerification === 'No'
        ? memo.financialVerification
        : 'Yes / No'
    doc.text(`Financial Verification: ${verificationText}`, MARGIN, contentStartY)
    contentStartY += 8

    const budgetApprovedText =
      memo.budgetApproved === 'Yes' || memo.budgetApproved === 'No'
        ? memo.budgetApproved
        : 'Yes / No'
    doc.text(`Budget Approved: ${budgetApprovedText}`, MARGIN, contentStartY)
    contentStartY += 8

    const commentsText = memo.financialComments || '_____________________________________________'
    doc.text(`Comment(s): ${commentsText}`, MARGIN, contentStartY)
    contentStartY += 8

    // Finance executive signature line
    if (memo.executiveSignaturePath) {
      try {
        doc.addImage(memo.executiveSignaturePath, 'PNG', MARGIN, contentStartY, 40, 16)
        contentStartY += 18
        doc.text(`Date: ${memo.executiveSignatureDate || '______________________'}`, MARGIN + 50, contentStartY - 2)
      } catch {
        doc.text('Signature: _________________  Date: ______________________', MARGIN, contentStartY)
      }
    } else {
      doc.text('Signature: _________________  Date: ______________________', MARGIN, contentStartY)
    }
    contentStartY += 10
  }

  // ── 3. RECOMMENDATION ────────────────────────────────────────────────
  contentStartY = ensureSpace(doc, contentStartY, 20)

  const sectionNumber = hasFinancialData ? '3' : '2'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`${sectionNumber}. RECOMMENDATION`, MARGIN, contentStartY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  contentStartY += 8

  const recommendationText = memo.recommendation || ''
  const recommendationLines = doc.splitTextToSize(recommendationText, CONTENT_WIDTH)
  contentStartY = ensureSpace(doc, contentStartY, recommendationLines.length * 5)
  doc.text(recommendationLines, MARGIN, contentStartY)
  contentStartY += recommendationLines.length * 5 + 15

  // ── Initiator Signature ───────────────────────────────────────────────
  if (memo.initiatorSignature?.signatureImgUrl) {
    contentStartY = ensureSpace(doc, contentStartY, 30)
    try {
      doc.addImage(memo.initiatorSignature.signatureImgUrl, 'PNG', MARGIN, contentStartY, 50, 20)
      contentStartY += 22
    } catch (error) {
      console.error('Error adding initiator signature to PDF:', error)
    }
  }

  // ── Footer on all pages ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc)
  }

  // ── Output ────────────────────────────────────────────────────────────
  if (preview) {
    const pdfDataUri = doc.output('datauristring')
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(
        `<html><head><title>${memo.subject || 'NSA Memorandum'}</title></head>` +
          `<body style="margin:0"><iframe width="100%" height="100%" src="${pdfDataUri}" style="border:none"></iframe></body></html>`,
      )
      newWindow.document.close()
    }
  } else {
    const fileName = memo.subject
      ? memo.subject
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .substring(0, 30)
      : 'memo'
    doc.save(`${fileName}.pdf`)
  }
}

export default generateMemoPDF
