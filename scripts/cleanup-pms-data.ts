/**
 * PMS Data Cleanup Script
 * Deletes all performance-related data due to AD department changes
 * Run with: cd apps/web && npx tsx ../../scripts/cleanup-pms-data.ts
 */

import { prisma } from '../apps/web/lib/pms/prisma'

async function cleanupPMSData() {
  console.log('🚨 PMS Data Cleanup Script')
  console.log('=' .repeat(50))
  console.log('This will DELETE all performance-related data:')
  console.log('  - Performance Agreements')
  console.log('  - Adhoc Tasks')
  console.log('  - Performance Reviews')
  console.log('  - 360 Rating data')
  console.log('')
  console.log('⚠️  This action CANNOT be undone!')
  console.log('=' .repeat(50))
  console.log('')

  try {
    // Count records before deletion
    console.log('📊 Current record counts:')
    const beforeCounts = {
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      rating360Cycles: await prisma.rating360Cycle.count(),
      peerRatings: await prisma.peerRating360.count(),
      subordinateRatings: await prisma.subordinateRating360.count(),
      rating360Answers: await prisma.rating360Answer.count(),
    }
    
    console.log(`  Performance Agreements: ${beforeCounts.performanceAgreements}`)
    console.log(`  Adhoc Tasks: ${beforeCounts.adhocTasks}`)
    console.log(`  Performance Reviews: ${beforeCounts.performanceReviews}`)
    console.log(`  360 Ratings: ${beforeCounts.rating360}`)
    console.log(`  360 Cycles: ${beforeCounts.rating360Cycles}`)
    console.log(`  Peer Ratings: ${beforeCounts.peerRatings}`)
    console.log(`  Subordinate Ratings: ${beforeCounts.subordinateRatings}`)
    console.log(`  360 Answers: ${beforeCounts.rating360Answers}`)
    console.log('')

    console.log('🗑️  Starting deletion process...')
    console.log('')

    // Delete in order of dependencies
    console.log('  Deleting 360 Rating Answers...')
    await prisma.rating360Answer.deleteMany()
    
    console.log('  Deleting Subordinate Ratings...')
    await prisma.subordinateRating360.deleteMany()
    
    console.log('  Deleting Peer Ratings...')
    await prisma.peerRating360.deleteMany()
    
    console.log('  Deleting 360 Ratings...')
    await prisma.rating360.deleteMany()
    
    console.log('  Deleting 360 Rating Cycles...')
    await prisma.rating360Cycle.deleteMany()
    
    console.log('  Deleting 360 Rating Questions...')
    await prisma.rating360Question.deleteMany()
    
    console.log('  Deleting 360 Rating Categories...')
    await prisma.rating360Category.deleteMany()
    
    console.log('  Deleting Adhoc Tasks...')
    await prisma.adhocTask.deleteMany()
    
    console.log('  Deleting Performance Agreements...')
    await prisma.performanceAgreement.deleteMany()
    
    console.log('  Deleting Performance Reviews...')
    await prisma.performanceReview.deleteMany()
    
    console.log('')
    console.log('✅ Deletion complete!')
    console.log('')

    // Verify deletion
    console.log('📊 Verifying deletion (all should be 0):')
    const afterCounts = {
      performanceAgreements: await prisma.performanceAgreement.count(),
      adhocTasks: await prisma.adhocTask.count(),
      performanceReviews: await prisma.performanceReview.count(),
      rating360: await prisma.rating360.count(),
      rating360Cycles: await prisma.rating360Cycle.count(),
      peerRatings: await prisma.peerRating360.count(),
      subordinateRatings: await prisma.subordinateRating360.count(),
      rating360Answers: await prisma.rating360Answer.count(),
    }
    
    console.log(`  Performance Agreements: ${afterCounts.performanceAgreements}`)
    console.log(`  Adhoc Tasks: ${afterCounts.adhocTasks}`)
    console.log(`  Performance Reviews: ${afterCounts.performanceReviews}`)
    console.log(`  360 Ratings: ${afterCounts.rating360}`)
    console.log(`  360 Cycles: ${afterCounts.rating360Cycles}`)
    console.log(`  Peer Ratings: ${afterCounts.peerRatings}`)
    console.log(`  Subordinate Ratings: ${afterCounts.subordinateRatings}`)
    console.log(`  360 Answers: ${afterCounts.rating360Answers}`)
    console.log('')

    const allZero = Object.values(afterCounts).every(count => count === 0)
    if (allZero) {
      console.log('✅ SUCCESS: All PMS data has been deleted!')
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
cleanupPMSData()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
