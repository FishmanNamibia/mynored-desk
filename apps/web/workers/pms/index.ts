import { Worker, Queue } from 'bullmq'
import { redis, redisConnection } from '@/lib/redis'
import { prisma } from '@/lib/pms/prisma'
import { logger } from '@/lib/logger'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// Create queue
export const performanceQueue = new Queue('performance-aggregation', {
  connection: redis,
})

// Worker to process performance aggregation
const worker = new Worker(
  'performance-aggregation',
  async (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Processing job')

    if (job.name === 'aggregate-daily') {
      await aggregatePerformance('daily')
    } else if (job.name === 'aggregate-weekly') {
      await aggregatePerformance('weekly')
    } else if (job.name === 'aggregate-monthly') {
      await aggregatePerformance('monthly')
    }

    logger.info({ jobId: job.id }, 'Job completed')
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
)

async function aggregatePerformance(period: 'daily' | 'weekly' | 'monthly') {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (period) {
    case 'weekly':
      startDate = startOfWeek(now)
      endDate = endOfWeek(now)
      break
    case 'monthly':
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
      break
    case 'daily':
    default:
      startDate = startOfDay(now)
      endDate = endOfDay(now)
      break
  }

  logger.info({ period, startDate, endDate }, 'Aggregating performance')

  // Get all completed targets in the period
  const targets = await prisma.target.findMany({
    where: {
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
    include: {
      responsible: {
        include: {
          division: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  })

  // Aggregate by user
  const userPerformance = new Map<string, { onTime: number; total: number }>()
  const divisionPerformance = new Map<string, { onTime: number; total: number }>()

  for (const target of targets) {
    const isOnTime = target.completedAt && target.dueDate && target.completedAt <= target.dueDate

    // User aggregation
    const userId = target.responsibleId
    const userStats = userPerformance.get(userId) || { onTime: 0, total: 0 }
    userStats.total++
    if (isOnTime) userStats.onTime++
    userPerformance.set(userId, userStats)

    // Division aggregation
    const divisionId = target.responsible.division?.id
    if (divisionId) {
      const divStats = divisionPerformance.get(divisionId) || { onTime: 0, total: 0 }
      divStats.total++
      if (isOnTime) divStats.onTime++
      divisionPerformance.set(divisionId, divStats)
    }
  }

  // Save to cache (disabled - performanceCache model not implemented)
  /*
  for (const [userId, stats] of userPerformance.entries()) {
    await prisma.performanceCache.upsert({
      where: {
        userId_period_periodStart: {
          userId,
          period,
          periodStart: startDate,
        },
      },
      create: {
        userId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
        onTimeCount: stats.onTime,
        totalCount: stats.total,
      },
      update: {
        onTimeCount: stats.onTime,
        totalCount: stats.total,
      },
    })
  }

  for (const [divisionId, stats] of divisionPerformance.entries()) {
    await prisma.performanceCache.upsert({
      where: {
        divisionId_period_periodStart: {
          divisionId,
          period,
          periodStart: startDate,
        },
      },
      create: {
        divisionId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
        onTimeCount: stats.onTime,
        totalCount: stats.total,
      },
      update: {
        onTimeCount: stats.onTime,
        totalCount: stats.total,
      },
    })
  }
  */

  logger.info(
    { 
      period, 
      usersProcessed: userPerformance.size, 
      divisionsProcessed: divisionPerformance.size 
    }, 
    'Performance aggregation completed'
  )
}

// Schedule jobs
async function scheduleJobs() {
  // Daily aggregation at midnight
  await performanceQueue.add(
    'aggregate-daily',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
    }
  )

  // Weekly aggregation on Mondays at 1 AM
  await performanceQueue.add(
    'aggregate-weekly',
    {},
    {
      repeat: {
        pattern: '0 1 * * 1', // Every Monday at 1 AM
      },
    }
  )

  // Monthly aggregation on the 1st at 2 AM
  await performanceQueue.add(
    'aggregate-monthly',
    {},
    {
      repeat: {
        pattern: '0 2 1 * *', // 1st of every month at 2 AM
      },
    }
  )

  logger.info('Scheduled performance aggregation jobs')
}

// Error handling
worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Job failed')
})

worker.on('error', (err) => {
  logger.error({ error: err }, 'Worker error')
})

// Start worker
logger.info('Starting BullMQ worker...')
scheduleJobs().catch(err => {
  logger.error({ error: err }, 'Failed to schedule jobs')
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...')
  await worker.close()
  await redis.quit()
  await redisConnection.quit()
  process.exit(0)
})
