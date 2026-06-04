import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Fetching All Subordinate Agreements ===')
    console.log('Supervisor ID:', user.id)
    console.log('Supervisor Email:', user.email)

    // Get the current user's database record to find ID (insensitive match).
    // orderBy createdAt asc = oldest (canonical) account wins — deterministic when duplicates exist.
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, jobTitle: true }
    })
    
    console.log('DB User found:', dbUser?.id, dbUser?.email)
    
    // Use the database user ID for queries, not the auth token ID
    const actualUserId = dbUser?.id || user.id

    // Migrate supervisor's own orphaned agreements (session ID → DB ID)
    if (user.id !== actualUserId) {
      const orphaned = await prisma.performanceAgreement.count({ where: { userId: user.id } })
      if (orphaned > 0) {
        await prisma.performanceAgreement.updateMany({ where: { userId: user.id }, data: { userId: actualUserId } })
        console.log(`[PENDING-APPROVAL] Migrated ${orphaned} agreements for supervisor from ${user.id} → ${actualUserId}`)
      }
    }

    // Get the current user's details for special-case logic
    const authUser = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: { 
        id: true, 
        jobTitle: true, 
        divisionName: true, 
        departmentName: true,
        departmentId: true,
        roles: { select: { role: { select: { name: true } } } }
      }
    })

    const dbRoles = authUser?.roles.map(r => r.role.name) || []
    // Merge DB roles with session roles for robustness (handles merged users whose DB record may lack roles)
    const sessionRoles = user.roles || []
    const userRoles = Array.from(new Set([...dbRoles, ...sessionRoles]))
    // Use DB jobTitle, fall back to session jobTitle (handles merged users)
    const jobTitle = (authUser?.jobTitle || user.jobTitle || '').toUpperCase()
    
    console.log('[PENDING-APPROVAL] Debug:', { actualUserId, jobTitle, dbRoles, sessionRoles, userRoles, dbDept: authUser?.departmentName, dbDeptId: authUser?.departmentId })

    // Check if user is SG or Deputy SG (they should only see direct reports)
    const isSGorDeputySG = userRoles.some(r => ['SG', 'DEPUTY_SG'].includes(r)) || 
                           jobTitle.includes('STATISTICIAN GENERAL') ||
                           jobTitle.includes('DEPUTY STATISTICIAN GENERAL')
    
    // Check if user is executive level (sees all subordinates across departments)
    const isExecutiveLevel = userRoles.some(r =>
      ['EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'ADMIN'].includes(r)
    ) || (jobTitle.includes('EXECUTIVE') && !isSGorDeputySG)

    const subordinateSelect = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      departmentName: true,
      divisionName: true,
      departmentId: true
    }

    // === Determine which users to show based on role ===
    let subordinates: Array<typeof subordinateSelect extends infer T ? { [K in keyof T]: any } : never> = []
    const selfEmail = user.email?.toLowerCase()

    if (isSGorDeputySG) {
      // Collect ALL IDs for this supervisor (canonical + ghost duplicates).
      // Without this, employees whose managerId points to an old/ghost account are missed.
      const allMyRecords = user.email ? await prisma.user.findMany({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: { id: true }
      }) : []
      const allMyIds = Array.from(new Set([actualUserId, user.id, ...allMyRecords.map(r => r.id)]))
      console.log(`[PENDING-APPROVAL] SG/DSG all IDs (canonical + ghost): ${allMyIds.join(', ')}`)

      // SG and Deputy SG: ONLY direct reports as per AD
      const directReports = await prisma.user.findMany({
        where: { managerId: { in: allMyIds } },
        select: subordinateSelect
      })
      subordinates = directReports

      // Also include employees whose agreements explicitly list this user as supervisor
      const subIds = subordinates.map(s => s.id)
      const agreementSubs = await prisma.performanceAgreement.findMany({
        where: { supervisorId: { in: allMyIds }, isAdhocContainer: false, userId: { notIn: subIds } },
        select: { userId: true },
        distinct: ['userId']
      })
      if (agreementSubs.length > 0) {
        const extraSubs = await prisma.user.findMany({
          where: { id: { in: agreementSubs.map(a => a.userId) } },
          select: subordinateSelect
        })
        subordinates.push(...extraSubs)
      }

    } else if (isExecutiveLevel) {
      // Executives: See ALL users in their department (by departmentName or departmentId)
      // This covers the full hierarchy regardless of managerId chain gaps in AD
      // Fallback to session department if DB record is missing dept info (merged users)
      // Last resort: extract department from jobTitle like "EXECUTIVE:IT & DATA MANAGEMENT"
      let extractedDept: string | null = null
      if (!authUser?.departmentName && !user.department && jobTitle.includes(':')) {
        extractedDept = jobTitle.split(':').slice(1).join(':').trim()
        // Convert to title case for matching: "IT & DATA MANAGEMENT" -> keep as-is for case-insensitive match
      }
      const effectiveDeptName = authUser?.departmentName || user.department || extractedDept || null
      const effectiveDeptId = authUser?.departmentId || null
      console.log('[PENDING-APPROVAL] Executive dept lookup:', { effectiveDeptName, effectiveDeptId, extractedDept })

      const deptConditions: any[] = []
      if (effectiveDeptName) {
        deptConditions.push({ departmentName: { equals: effectiveDeptName, mode: 'insensitive' } })
      }
      if (effectiveDeptId) {
        deptConditions.push({ departmentId: effectiveDeptId })
      }
      // Find ALL user IDs belonging to the logged-in user (merged users may have multiple records)
      const allSelfRecords = selfEmail ? await prisma.user.findMany({
        where: { email: { equals: selfEmail, mode: 'insensitive' } },
        select: { id: true }
      }) : []
      const allSelfIds = [actualUserId, user.id, ...allSelfRecords.map(r => r.id)]
      console.log('[PENDING-APPROVAL] Self IDs to exclude:', allSelfIds)

      if (deptConditions.length > 0) {
        const deptUsers = await prisma.user.findMany({
          where: { OR: deptConditions, id: { notIn: allSelfIds } },
          select: subordinateSelect
        })
        subordinates = deptUsers
      } else {
        // Fallback: recursive managerId traversal if no dept info
        const foundIds = new Set<string>()
        const findSubsRecursive = async (managerIds: string[]) => {
          if (managerIds.length === 0) return
          const directReports = await prisma.user.findMany({
            where: { managerId: { in: managerIds }, id: { notIn: Array.from(foundIds) } },
            select: subordinateSelect
          })
          const newIds: string[] = []
          for (const sub of directReports) {
            if (!foundIds.has(sub.id)) {
              foundIds.add(sub.id)
              subordinates.push(sub)
              newIds.push(sub.id)
            }
          }
          if (newIds.length > 0 && foundIds.size < 500) {
            await findSubsRecursive(newIds)
          }
        }
        await findSubsRecursive([actualUserId])
      }

    } else {
      // Regular managers/supervisors: full recursive hierarchy — see everyone below them at all levels.
      // IMPORTANT: collect ALL DB account IDs for the logged-in user (canonical + ghost duplicates).
      // Employees whose managerId points to a ghost/old account will be missed if we only use actualUserId.
      const allMyRecords = user.email ? await prisma.user.findMany({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: { id: true }
      }) : []
      const allMyIds = Array.from(new Set([actualUserId, user.id, ...allMyRecords.map(r => r.id)]))
      console.log(`[PENDING-APPROVAL] All IDs for supervisor (canonical + ghost): ${allMyIds.join(', ')}`)

      // Recursive traversal: collect the full subtree of subordinates at all levels
      const foundIds = new Set<string>()
      const findSubsRecursive = async (managerIds: string[]) => {
        if (managerIds.length === 0) return
        const reports = await prisma.user.findMany({
          where: { managerId: { in: managerIds }, id: { notIn: Array.from(foundIds) } },
          select: subordinateSelect
        })
        const newIds: string[] = []
        for (const sub of reports) {
          if (!foundIds.has(sub.id)) {
            foundIds.add(sub.id)
            subordinates.push(sub)
            newIds.push(sub.id)
          }
        }
        // Recurse into the next level (cap at 500 to avoid runaway queries)
        if (newIds.length > 0 && foundIds.size < 500) {
          await findSubsRecursive(newIds)
        }
      }
      await findSubsRecursive(allMyIds)
      console.log(`[PENDING-APPROVAL] Recursive traversal found ${subordinates.length} subordinates`)

      // Also include users who have agreements where current user is listed as supervisor
      // (covers cases where supervisorId was set explicitly on the agreement)
      const subIds = new Set(subordinates.map(s => s.id))
      const agreementSubs = await prisma.performanceAgreement.findMany({
        where: { supervisorId: { in: allMyIds }, isAdhocContainer: false, userId: { notIn: Array.from(subIds) } },
        select: { userId: true },
        distinct: ['userId']
      })
      if (agreementSubs.length > 0) {
        const extraSubs = await prisma.user.findMany({
          where: { id: { in: agreementSubs.map(a => a.userId) } },
          select: subordinateSelect
        })
        subordinates.push(...extraSubs)
      }
    }

    // Remove self from list (by both ID and email to handle merged users with multiple DB records)
    subordinates = subordinates.filter(s => s.id !== actualUserId && s.id !== user.id && s.email?.toLowerCase() !== selfEmail)
    console.log(`Found ${subordinates.length} target users`)

    // Batch-migrate subordinates' agreements from old/merged user IDs.
    // For each subordinate email, the NEWEST user record is canonical (orderBy createdAt desc)
    // — this is deterministic and always picks the main (most recently created) account.
    if (subordinates.length > 0) {
      const subEmails = subordinates.map(s => s.email?.toLowerCase()).filter(Boolean) as string[]
      // Case-insensitive: find ALL user records whose email matches any subordinate email
      const allSubUserRecords = await prisma.user.findMany({
        where: { OR: subEmails.map(e => ({ email: { equals: e, mode: 'insensitive' as const } })) },
        orderBy: { createdAt: 'asc' }, // oldest first — canonical will be first match per email
        select: { id: true, email: true }
      })
      // Build email → canonical ID map: oldest record per email is canonical
      const canonicalIds = new Map<string, string>()
      for (const u of allSubUserRecords) {
        const key = u.email?.toLowerCase()
        if (key && !canonicalIds.has(key)) {
          canonicalIds.set(key, u.id) // first seen = oldest (due to orderBy asc) = canonical
        }
      }
      // Migrate agreements from any non-canonical IDs to canonical
      for (const u of allSubUserRecords) {
        const key = u.email?.toLowerCase()
        const canonical = key ? canonicalIds.get(key) : undefined
        if (canonical && u.id !== canonical) {
          const migrated = await prisma.performanceAgreement.updateMany({
            where: { userId: u.id },
            data: { userId: canonical }
          })
          if (migrated.count > 0) {
            console.log(`[PENDING-APPROVAL] Migrated ${migrated.count} agreements for subordinate ${u.email} from ${u.id} → ${canonical}`)
          }
        }
      }
    }
    console.log(`User is SG/Deputy SG: ${isSGorDeputySG}, Executive: ${isExecutiveLevel}`)

    // Special case: Add users whose agreements this user can approve (based on jobTitle)
    let specialSubordinates: typeof subordinates = []
    const jobTitleLower = authUser?.jobTitle?.toLowerCase() || ''

    if (jobTitleLower.includes('statistician general') || jobTitleLower === 'sg') {
      // SG can approve DSG agreements
      const dsgUsers = await prisma.user.findMany({
        where: {
          OR: [
            { jobTitle: { contains: 'Deputy Statistician General', mode: 'insensitive' } },
            { jobTitle: { contains: 'DSG', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          departmentName: true,
          divisionName: true,
          departmentId: true
        }
      })
      specialSubordinates = dsgUsers
    } else if (jobTitleLower.includes('board') && jobTitleLower.includes('chair')) {
      // Board Chairperson can approve SG agreements
      const sgUsers = await prisma.user.findMany({
        where: {
          OR: [
            { jobTitle: { contains: 'Statistician General', mode: 'insensitive' } },
            { jobTitle: { equals: 'SG', mode: 'insensitive' } }
          ],
          NOT: { jobTitle: { contains: 'Deputy', mode: 'insensitive' } }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          departmentName: true,
          divisionName: true,
          departmentId: true
        }
      })
      specialSubordinates = sgUsers
    }

    // Combine regular subordinates with special subordinates, always excluding self
    let combinedSubordinates = [...subordinates, ...specialSubordinates.filter(
      special => !subordinates.some(sub => sub.id === special.id)
    )].filter(s => s.id !== actualUserId)
    console.log(`All subordinates (including special): ${combinedSubordinates.length}`)

    // === Chain-based injection: surface items to Level 2+ approvers ===
    // When Level 1 (direct supervisor) accepts, the chain advances to Level 2 (manager).
    // The manager is NOT the employee's direct supervisor, so they won't be in combinedSubordinates.
    // We query PerformanceRatingChain to find agreements currently awaiting THIS user's approval
    // (matched by userId or email to handle ghost accounts), then inject those employees.
    try {
      const chainPendingRows = await prisma.$queryRawUnsafe<Array<{ agreementId: string; ratingApprovalLevel: number; ratingApprovalChain: any }>>(
        `SELECT "agreementId", "ratingApprovalLevel", "ratingApprovalChain"
         FROM "PerformanceRatingChain"
         WHERE "ratingApprovalLevel" > 0
           AND "ratingApprovalLevel" < 99
           AND "ratingApprovalLevel" != -1
           AND EXISTS (
             SELECT 1 FROM jsonb_array_elements("ratingApprovalChain"->'chain') AS member
             WHERE (
               (member->>'userId' = $1)
               OR (lower(member->>'email') = lower($2))
             )
             AND (member->>'level')::int = "ratingApprovalLevel"
           )`,
        actualUserId,
        user.email || ''
      )

      if (chainPendingRows.length > 0) {
        const chainAgreementIds = chainPendingRows.map(r => r.agreementId)
        // Find the employees who own these agreements
        const chainAgreements = await prisma.performanceAgreement.findMany({
          where: { id: { in: chainAgreementIds }, isAdhocContainer: false },
          select: { userId: true },
          distinct: ['userId']
        })
        const existingSubIds = new Set(combinedSubordinates.map(s => s.id))
        const newSubIds = chainAgreements
          .map(a => a.userId)
          .filter(id => !existingSubIds.has(id) && id !== actualUserId && id !== user.id)

        if (newSubIds.length > 0) {
          const chainSubordinates = await prisma.user.findMany({
            where: { id: { in: newSubIds } },
            select: subordinateSelect
          })
          // Canonicalise each (oldest account by email) before adding
          const seen = new Set<string>()
          for (const sub of chainSubordinates) {
            if (!sub.email || seen.has(sub.email.toLowerCase())) continue
            seen.add(sub.email.toLowerCase())
            combinedSubordinates.push(sub)
          }
          console.log(`[PENDING-APPROVAL] Injected ${chainSubordinates.length} chain-pending employees (Level 2+)`)
        }
      }
    } catch (e) {
      console.error('[PENDING-APPROVAL] Chain-based subordinate lookup failed (non-critical):', e)
    }

    // === Normalize all subordinates to canonical IDs + deduplicate ===
    // This covers ghost accounts slipping in via chain injection or managerId mismatches.
    // For each subordinate email, the oldest DB record is canonical (orderBy createdAt asc).
    if (combinedSubordinates.length > 0) {
      const allSubEmails = Array.from(new Set(
        combinedSubordinates.map(s => s.email?.toLowerCase()).filter(Boolean) as string[]
      ))
      const allSubRecords = await prisma.user.findMany({
        where: { OR: allSubEmails.map(e => ({ email: { equals: e, mode: 'insensitive' as const } })) },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true }
      })
      // Build canonical map: oldest record per email
      const canonMap = new Map<string, string>()
      for (const r of allSubRecords) {
        const key = r.email?.toLowerCase()
        if (key && !canonMap.has(key)) canonMap.set(key, r.id)
      }
      // Migrate agreements from any non-canonical IDs we haven't migrated yet
      for (const r of allSubRecords) {
        const key = r.email?.toLowerCase()
        const canon = key ? canonMap.get(key) : undefined
        if (canon && r.id !== canon) {
          const migrated = await prisma.performanceAgreement.updateMany({
            where: { userId: r.id },
            data: { userId: canon }
          })
          if (migrated.count > 0) {
            console.log(`[PENDING-APPROVAL] Normalize-migrated ${migrated.count} agreements for ${r.email} ${r.id} → ${canon}`)
          }
        }
      }
      // Re-map each combinedSubordinate to its canonical ID
      combinedSubordinates = combinedSubordinates.map(sub => {
        const key = sub.email?.toLowerCase()
        const canonId = key ? canonMap.get(key) : undefined
        if (canonId && canonId !== sub.id) {
          return { ...sub, id: canonId }
        }
        return sub
      })
      // Deduplicate: after re-mapping, two ghost/real accounts for same person now share an ID
      const seenSubIds = new Set<string>()
      combinedSubordinates = combinedSubordinates.filter(sub => {
        if (seenSubIds.has(sub.id)) return false
        seenSubIds.add(sub.id)
        return true
      })
      console.log(`[PENDING-APPROVAL] After normalization: ${combinedSubordinates.length} unique subordinates`)
    }

    // Get all agreements for these subordinates, then batch-load rating chain data
    const allAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: { in: combinedSubordinates.map(s => s.id) },
        isAdhocContainer: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true,
            divisionName: true
          }
        },
        initiative: {
          select: {
            title: true,
            measure: true,
            target: true,
            objective: {
              select: {
                title: true,
                goal: {
                  select: {
                    title: true,
                    goalNumber: true
                  }
                }
              }
            }
          }
        },
        performancePeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    })

    // Batch-load rating chain data for all agreements
    const allAgreementIds = allAgreements.map(a => a.id)
    const chainDataMap = new Map<string, { ratingApprovalLevel: number; ratingApprovalChain: any }>()
    if (allAgreementIds.length > 0) {
      try {
        const chainRows = await prisma.$queryRawUnsafe<Array<{ agreementId: string; ratingApprovalLevel: number; ratingApprovalChain: any }>>(
          `SELECT "agreementId", "ratingApprovalLevel", "ratingApprovalChain" FROM "PerformanceRatingChain" WHERE "agreementId" = ANY($1::text[])`,
          allAgreementIds
        )
        for (const row of chainRows) {
          chainDataMap.set(row.agreementId, { ratingApprovalLevel: row.ratingApprovalLevel, ratingApprovalChain: row.ratingApprovalChain })
        }
      } catch { /* PerformanceRatingChain table might not exist yet — gracefully ignore */ }
    }

    // Create result for each subordinate
    const result = combinedSubordinates.map(subordinate => {
      const userAgreements = allAgreements.filter(a => a.userId === subordinate.id)
      
      const approvedCount = userAgreements.filter(a => a.approvalStatus === 'APPROVED').length
      const rejectedCount = userAgreements.filter(a => a.approvalStatus === 'REJECTED').length
      // Submitted = confirmedAt is set (employee submitted for approval) regardless of approvalStatus value
      // approvalStatus may be null, 'PENDING', etc. — all mean "awaiting supervisor action"
      const submittedCount = userAgreements.filter(a => !!a.confirmedAt).length
      const pendingCount = userAgreements.filter(a =>
        a.approvalStatus === 'PENDING' || (!!a.confirmedAt && !a.approvalStatus)
      ).length
      const notSubmittedCount = userAgreements.filter(a => !a.confirmedAt && !a.approvalStatus).length

      // Determine overall status
      let overallStatus = 'NOT_SUBMITTED'
      if (userAgreements.length === 0) {
        overallStatus = 'NO_ASSIGNMENTS'
      } else if (approvedCount === userAgreements.length) {
        overallStatus = 'APPROVED'
      } else if (notSubmittedCount === userAgreements.length) {
        overallStatus = 'NOT_SUBMITTED'
      } else if (submittedCount > 0 && approvedCount === 0 && rejectedCount === 0) {
        overallStatus = 'PENDING'
      } else if (approvedCount > 0 || rejectedCount > 0 || pendingCount > 0) {
        overallStatus = 'MIXED'
      }
      
      const totalWeight = userAgreements.reduce((sum, a) => sum + (a.weight || 0), 0)
      const lastSubmission = userAgreements
        .filter(a => a.confirmedAt)
        .sort((a, b) => new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime())[0]

      // Check if agreement is complete (all initiatives are APPROVED)
      const notApprovedCount = userAgreements.filter(a => 
        a.approvalStatus !== 'APPROVED'
      ).length
      const isComplete = userAgreements.length > 0 && notApprovedCount === 0

      return {
        id: `user-${subordinate.id}`,
        userId: subordinate.id,
        user: {
          id: subordinate.id,
          name: `${subordinate.firstName || ''} ${subordinate.lastName || ''}`.trim() || 'Unknown User',
          email: subordinate.email,
          jobTitle: subordinate.jobTitle || null,
          department: { name: subordinate.departmentName || 'Unknown' },
          division: { name: subordinate.divisionName || null }
        },
        agreements: userAgreements.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || '',
          kpi: a.kpi || '',
          target: a.target || '',
          customAction: a.customAction || '',
          weight: a.weight || 0,
          status: a.status || 'NOT_STARTED',
          percentComplete: a.percentComplete || 0,
          evidenceUrl: a.evidenceUrl || null,
          evidenceNotes: a.evidenceNotes || null,
          rating: a.rating || null,
          progressNotes: a.progressNotes || null,
          initiative: a.initiative,
          performancePeriod: a.performancePeriod,
          dueDate: a.dueDate,
          confirmedAt: a.confirmedAt,
          approvedAt: a.approvedAt,
          completedAt: a.completedAt,
          approvalStatus: a.approvalStatus,
          ratingApprovalLevel: chainDataMap.get(a.id)?.ratingApprovalLevel ?? null,
          ratingApprovalChain: chainDataMap.get(a.id)?.ratingApprovalChain ?? null
        })),
        submittedAt: lastSubmission?.confirmedAt || null,
        totalWeight,
        overallStatus,
        isComplete,
        incompleteCount: notApprovedCount,
        counts: {
          total: userAgreements.length,
          pending: pendingCount,
          submitted: submittedCount,
          approved: approvedCount,
          rejected: rejectedCount,
          notSubmitted: notSubmittedCount
        }
      }
    })

    console.log(`Total subordinates: ${result.length}`)
    console.log(`With agreements: ${result.filter(r => r.agreements.length > 0).length}`)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching pending agreements:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
