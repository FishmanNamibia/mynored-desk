/**
 * Complete Database Cleanup Script
 * Deletes ALL users and ALL PMS data
 * Run from apps/web directory: npx tsx scripts/cleanup-all-data.ts
 */

import { prisma } from '../lib/pms/prisma'

async function cleanupAllData() {
  console.log('')
  console.log('🚨🚨🚨 CRITICAL WARNING 🚨🚨🚨')
  console.log('=' .repeat(60))
  console.log('This will DELETE ALL DATA from the database:')
  console.log('  ❌ ALL User Accounts')
  console.log('  ❌ ALL Performance Agreements')
  console.log('  ❌ ALL Adhoc Tasks')
  console.log('  ❌ ALL Performance Reviews')
  console.log('  ❌ ALL 360 Rating data')
  console.log('  ❌ ALL Sessions, Notifications, Audit Logs')
  console.log('')
  console.log('⚠️  This action CANNOT be undone!')
  console.log('=' .repeat(60))
  console.log('')

  try {
    // Count records before deletion
    console.log('📊 Current record counts:')
    const beforeCounts = {
      users: await prisma.user.count(),
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      rating360Cycles: await prisma.rating360Cycle.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
    }
    
    console.log(`  Users: ${beforeCounts.users}`)
    console.log(`  Performance Agreements: ${beforeCounts.performanceAgreements}`)
    console.log(`  Adhoc Tasks: ${beforeCounts.adhocTasks}`)
    console.log(`  Performance Reviews: ${beforeCounts.performanceReviews}`)
    console.log(`  360 Ratings: ${beforeCounts.rating360}`)
    console.log(`  360 Cycles: ${beforeCounts.rating360Cycles}`)
    console.log(`  Sessions: ${beforeCounts.sessions}`)
    console.log(`  Notifications: ${beforeCounts.notifications}`)
    console.log('')

    console.log('🗑️  Starting deletion process...')
    console.log('')

    // Delete in order of dependencies
    console.log('  [1/14] Deleting 360 Rating Answers...')
    await prisma.rating360Answer.deleteMany()
    
    console.log('  [2/14] Deleting Subordinate Ratings...')
    await prisma.subordinateRating360.deleteMany()
    
    console.log('  [3/14] Deleting Peer Ratings...')
    await prisma.peerRating360.deleteMany()
    
    console.log('  [4/14] Deleting 360 Ratings...')
    await prisma.rating360.deleteMany()
    
    console.log('  [5/14] Deleting 360 Rating Cycles...')
    await prisma.rating360Cycle.deleteMany()
    
    console.log('  [6/14] Deleting 360 Rating Questions...')
    await prisma.rating360Question.deleteMany()
    
    console.log('  [7/14] Deleting 360 Rating Categories...')
    await prisma.rating360Category.deleteMany()
    
    console.log('  [8/14] Deleting Adhoc Tasks...')
    await prisma.adhocTask.deleteMany()
    
    console.log('  [9/14] Deleting Performance Agreements...')
    await prisma.performanceAgreement.deleteMany()
    
    console.log('  [10/14] Deleting Performance Reviews...')
    await prisma.performanceReview.deleteMany()
    
    console.log('  [11/14] Deleting User Roles...')
    await prisma.userRole.deleteMany()
    
    console.log('  [12/14] Deleting Sessions...')
    await prisma.session.deleteMany()
    
    console.log('  [13/14] Deleting Notifications & Audit Logs...')
    await prisma.notification.deleteMany()
    await prisma.auditLog.deleteMany()
    
    console.log('  [14/14] Deleting ALL Users...')
    await prisma.user.deleteMany()
    
    console.log('')
    console.log('✅ Deletion complete!')
    console.log('')

    // Verify deletion
    console.log('📊 Verifying deletion (all should be 0):')
    const afterCounts = {
      users: await prisma.user.count(),
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      rating360Cycles: await prisma.rating360Cycle.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
    }
    
    console.log(`  Users: ${afterCounts.users}`)
    console.log(`  Performance Agreements: ${afterCounts.performanceAgreements}`)
    console.log(`  Adhoc Tasks: ${afterCounts.adhocTasks}`)
    console.log(`  Performance Reviews: ${afterCounts.performanceReviews}`)
    console.log(`  360 Ratings: ${afterCounts.rating360}`)
    console.log(`  360 Cycles: ${afterCounts.rating360Cycles}`)
    console.log(`  Sessions: ${afterCounts.sessions}`)
    console.log(`  Notifications: ${afterCounts.notifications}`)
    console.log('')

    const allZero = Object.values(afterCounts).every(count => count === 0)
    if (allZero) {
      console.log('✅ SUCCESS: All data has been deleted!')
      console.log('Users can now sign in fresh with updated AD departments.')
    } else {
      console.log('⚠️  WARNING: Some records remain. Please check manually.')
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Execute
cleanupAllData()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
