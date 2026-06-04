import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'agreement' // 'agreement' or 'rated'

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get current user and check access
    const currentUser = await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      select: { id: true, email: true, jobTitle: true, departmentId: true, departmentName: true, managerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check access permissions
    const jobTitle = (currentUser.jobTitle || '').toLowerCase()
    const department = (currentUser.departmentName || '').toLowerCase()
    const email = currentUser.email.toLowerCase()
    
    const isGeorgeMuhongo = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isHCExecutive = jobTitle.includes('executive') && department.includes('human capital')
    const isExecutive = jobTitle.includes('executive')
    const isManager = jobTitle.includes('manager') || jobTitle.includes('senior') || jobTitle.includes('head')

    // For rated agreements, only George and HC Executive can access
    if (type === 'rated' && !isGeorgeMuhongo && !isHCExecutive) {
      return NextResponse.json({ error: 'Access denied for rated agreements' }, { status: 403 })
    }

    // Get the target user with their manager/supervisor info
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        jobTitle: true, departmentName: true, divisionName: true,
        departmentId: true, managerId: true, signatureUrl: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, jobTitle: true, signatureUrl: true }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Check if user has access to download this person's agreement
    if (!isGeorgeMuhongo && !isHCExecutive) {
      const isSubordinate = targetUser.managerId === currentUser.id
      const sameDepartment = targetUser.departmentId === currentUser.departmentId
      if (!isSubordinate && !sameDepartment && !isExecutive) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Get the user's approved agreements
    const whereClause: any = {
      userId,
      performancePeriodId: activePeriod?.id,
      isAdhocContainer: false,
      approvalStatus: 'APPROVED'
    }

    // If requesting rated, filter for rated agreements
    if (type === 'rated') {
      whereClause.rating = { not: null }
    }

    const agreements = await prisma.performanceAgreement.findMany({
      where: whereClause,
      include: {
        initiative: {
          include: {
            objective: {
              include: { goal: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (agreements.length === 0) {
      return NextResponse.json({ 
        error: type === 'rated' ? 'No rated agreements found' : 'No approved agreements found' 
      }, { status: 404 })
    }

    // Generate PDF content (simplified - in production would use a PDF library)
    const userName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email
    const periodName = activePeriod?.name || 'Current Period'
    
    // Create a simple HTML document that can be printed as PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Agreement - ${userName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header img { max-width: 150px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-item { background: #f3f4f6; padding: 15px; border-radius: 8px; }
    .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .info-value { font-size: 16px; font-weight: bold; color: #111827; }
    .agreement { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .agreement-title { font-weight: bold; color: #1f2937; margin-bottom: 10px; }
    .agreement-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 14px; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 500; }
    .rating { color: #059669; font-size: 18px; font-weight: bold; }
    .signature-section { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-box { border-top: 1px solid #000; padding-top: 10px; }
    .signature-label { font-size: 12px; color: #6b7280; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Namibia Statistics Agency</h1>
    <h2>Performance ${type === 'rated' ? 'Rating' : 'Agreement'} Document</h2>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Employee Name</div>
      <div class="info-value">${userName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Department</div>
      <div class="info-value">${targetUser.departmentName || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Position</div>
      <div class="info-value">${targetUser.jobTitle || 'N/A'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Performance Period</div>
      <div class="info-value">${periodName}</div>
    </div>
  </div>

  <h2>Performance Agreements (${agreements.length})</h2>
  
  ${agreements.map((agreement, index) => `
    <div class="agreement">
      <div class="agreement-title">${index + 1}. ${agreement.title}</div>
      <div class="agreement-details">
        <div>
          <span class="detail-label">Goal:</span><br>
          <span class="detail-value">${agreement.initiative?.objective?.goal?.title || 'N/A'}</span>
        </div>
        <div>
          <span class="detail-label">Weight:</span><br>
          <span class="detail-value">${agreement.weight || 0}%</span>
        </div>
        ${type === 'rated' ? `
        <div>
          <span class="detail-label">Rating:</span><br>
          <span class="rating">${agreement.rating ? ((agreement.rating / 5) * 100).toFixed(0) : 0}%</span>
        </div>
        ` : `
        <div>
          <span class="detail-label">Status:</span><br>
          <span class="detail-value" style="color: #059669;">Approved</span>
        </div>
        `}
      </div>
      ${agreement.customAction ? `<p style="margin-top: 10px; font-size: 14px; color: #4b5563;">${agreement.customAction}</p>` : ''}
    </div>
  `).join('')}

  <div class="signature-section">
    <div>
      <div class="signature-box">
        <div class="signature-label">${(() => {
          const jobTitle = (targetUser.jobTitle || '').toLowerCase()
          if (jobTitle.includes('statistician') && jobTitle.includes('general') && !jobTitle.includes('deputy')) {
            return 'Statistician General'
          } else if (jobTitle.includes('deputy') && jobTitle.includes('statistician')) {
            return 'Deputy Statistician General'
          } else if (jobTitle.includes('executive') && !jobTitle.includes('deputy') && !jobTitle.includes('assistant')) {
            return 'Executive'
          }
          return 'Employee'
        })()}</div>
        ${targetUser.signatureUrl ? `
        <div style="margin: 10px 0;">
          <img src="${targetUser.signatureUrl}" alt="Employee Signature" style="max-height: 60px; max-width: 200px;" />
        </div>
        ` : ''}
        <div style="font-size: 14px; color: #111827; margin-top: 5px;">${userName}</div>
        <div style="font-size: 12px; color: #6b7280;">${targetUser.jobTitle || 'Staff'}</div>
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
    </div>
    <div>
      <div class="signature-box">
        <div class="signature-label">${(() => {
          if (!targetUser.manager) return 'Supervisor'
          const managerJobTitle = (targetUser.manager.jobTitle || '').toLowerCase()
          if (managerJobTitle.includes('statistician') && managerJobTitle.includes('general') && !managerJobTitle.includes('deputy')) {
            return 'Statistician General'
          } else if (managerJobTitle.includes('deputy') && managerJobTitle.includes('statistician')) {
            return 'Deputy Statistician General'
          } else if (managerJobTitle.includes('executive') && !managerJobTitle.includes('deputy') && !managerJobTitle.includes('assistant')) {
            return 'Executive'
          }
          return 'Supervisor'
        })()}</div>
        ${targetUser.manager ? `
        ${targetUser.manager.signatureUrl ? `
        <div style="margin: 10px 0;">
          <img src="${targetUser.manager.signatureUrl}" alt="Manager Signature" style="max-height: 60px; max-width: 200px;" />
        </div>
        ` : ''}
        <div style="font-size: 14px; color: #111827; margin-top: 5px;">${targetUser.manager.firstName || ''} ${targetUser.manager.lastName || ''}</div>
        <div style="font-size: 12px; color: #6b7280;">${targetUser.manager.jobTitle || ''}</div>
        ` : ''}
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
    </div>
  </div>

  <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af;">
    Generated on ${new Date().toLocaleDateString()} | Namibia Statistics Agency Performance Management System
  </p>
</body>
</html>
    `

    // Return as HTML (browser can print to PDF)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${userName.replace(/\s+/g, '_')}_${type}_agreement.html"`
      }
    })
  } catch (error) {
    console.error('Error downloading agreement:', error)
    return NextResponse.json({ error: 'Failed to download agreement' }, { status: 500 })
  }
}
