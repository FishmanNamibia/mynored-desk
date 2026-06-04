import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Disable pino-pretty in Next.js to avoid worker thread issues
  // Use simple JSON logging instead
  ...(process.env.NODE_ENV === 'development' && {
    formatters: {
      level: (label: string) => {
        return { level: label }
      },
    },
  }),
})
