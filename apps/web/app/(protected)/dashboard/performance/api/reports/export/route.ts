import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'excel'
    const level = searchParams.get('level') || 'organization'
    const department = searchParams.get('department') || 'all'

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      include: { department: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get active period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Get all users and agreements
    const users = await prisma.user.findMany({
      include: { department: true }
    })

    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        performancePeriodId: activePeriod?.id,
        isAdhocContainer: false
      },
      include: {
        user: { include: { department: true } }
      }
    })

    // Build report data
    const reportData: any[] = []

    if (level === 'organization' || level === 'department') {
      // Department-level summary
      const deptMap = new Map<string, { staff: number; approved: number; pending: number; totalRating: number; ratedCount: number }>()
      
      for (const user of users) {
        const deptName = user.department?.name || (user as any).departmentName || 'Unknown'
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { staff: 0, approved: 0, pending: 0, totalRating: 0, ratedCount: 0 })
        }
        deptMap.get(deptName)!.staff++
      }

      for (const agreement of agreements) {
        const deptName = agreement.user?.department?.name || (agreement.user as any)?.departmentName || 'Unknown'
        const dept = deptMap.get(deptName)
        if (dept) {
          if (agreement.approvalStatus === 'APPROVED') dept.approved++
          if (agreement.approvalStatus === 'PENDING') dept.pending++
          if (agreement.rating) {
            dept.totalRating += agreement.rating
            dept.ratedCount++
          }
        }
      }

      for (const [name, data] of deptMap) {
        if (department !== 'all' && name !== department) continue
        reportData.push({
          Department: name,
          'Total Staff': data.staff,
          'Approved Agreements': data.approved,
          'Pending Agreements': data.pending,
          'Average Rating': data.ratedCount > 0 ? ((data.totalRating / data.ratedCount / 5) * 100).toFixed(1) + '%' : 'N/A',
          'Completion Rate': data.staff > 0 ? ((data.approved / data.staff) * 100).toFixed(1) + '%' : '0%'
        })
      }
    }

    if (level === 'individual') {
      // Individual-level data
      for (const user of users) {
        const userAgreements = agreements.filter((a: any) => a.userId === user.id)
        const approved = userAgreements.filter((a: any) => a.approvalStatus === 'APPROVED')
        const rated = approved.filter((a: any) => a.rating && a.rating > 0)
        const avgRating = rated.length > 0 
          ? rated.reduce((sum: number, a: any) => sum + (a.rating || 0), 0) / rated.length 
          : 0

        // Get department from relation first, then from AD field
        const userDepartment = user.department?.name || (user as any).departmentName || 'Unknown'
        
        reportData.push({
          Name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          Email: user.email,
          Department: userDepartment,
          Position: user.jobTitle || user.position || 'Staff',
          'Total Agreements': userAgreements.length,
          'Approved': approved.length,
          'Rating': avgRating > 0 ? ((avgRating / 5) * 100).toFixed(1) + '%' : 'N/A'
        })
      }
    }

    // Generate CSV/Excel output
    if (reportData.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 })
    }

    const headers = Object.keys(reportData[0])
    const rows = reportData.map(row => headers.map(h => row[h]))

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const contentType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv'
    const extension = format === 'excel' ? 'csv' : 'csv'

    return new NextResponse(csv, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="performance-report-${level}-${new Date().toISOString().split('T')[0]}.${extension}"`
      }
    })
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
