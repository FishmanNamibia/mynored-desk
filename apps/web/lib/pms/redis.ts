import Redis from 'ioredis'

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }
  
  const host = process.env.REDIS_HOST || 'localhost'
  const port = process.env.REDIS_PORT || 6379
  const password = process.env.REDIS_PASSWORD || ''
  
  return password 
    ? `redis://:${password}@${host}:${port}`
    : `redis://${host}:${port}`
}

export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
})

export const redisConnection = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
})
