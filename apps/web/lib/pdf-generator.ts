import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFGenerationOptions {
  userId: string
  userName: string
  periodName: string
  startDate: string
  endDate: string
  agreements: any[]
  hasRatings: boolean
  myRateData?: any
  adhocTasks?: any[]
  employeeSignature?: string | null
  supervisorData?: any
  managerData?: any
  executiveData?: any
}

export async function generatePerformanceAgreementPDF(options: PDFGenerationOptions) {
  const {
    userName,
    periodName,
    startDate,
    endDate,
    agreements,
    hasRatings,
    myRateData,
    adhocTasks = [],
    employeeSignature,
    supervisorData,
    managerData,
    executiveData
  } = options

  // Filter to regular agreements only
  const regularAgreements = agreements.filter(a => !a.isAdhocContainer)

  // Create PDF in landscape orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Add NSA Logo
  try {
    const response = await fetch('/nored-logo.svg')
    const svgText = await response.text()
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    
    const img = new Image()
    img.src = url
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      setTimeout(reject, 5000)
    })
    
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 200, 200)
      const imgData = canvas.toDataURL('image/png')
      doc.addImage(imgData, 'PNG', pageWidth / 2 - 15, 10, 30, 30)
    }
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error loading logo:', error)
    doc.setFillColor(41, 128, 185)
    doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
    doc.setFontSize(12)
    doc.setTextColor(255, 255, 255)
    doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
  }
  
  doc.setTextColor(0, 0, 0)
  
  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(userName, pageWidth / 2, 48, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(periodName, pageWidth / 2, 55, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 61, { align: 'center' })
  
  const totalWeight = regularAgreements.reduce((sum, a) => sum + (a.weight || 0), 0)
  const finalRating = myRateData?.finalRating ?? 0
  const finalPercentage = myRateData?.finalPercentage ?? 0
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 68, { align: 'center' })
  
  if (hasRatings && myRateData) {
    doc.text(`Overall Performance Score: ${finalRating.toFixed(2)} / 5.0  (${finalPercentage.toFixed(1)}%)`, pageWidth / 2, 74, { align: 'center' })
  }
  
  // This is a simplified version - you'll need to copy the full table generation logic
  // from the my-tasks/performance page.tsx exportToPDF function (lines 356-850)
  // Including all the autoTable calls, signature sections, etc.
  
  return doc
}
