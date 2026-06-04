export const AI_CONFIG = {
  enabled: process.env.OLLAMA_ENABLED === 'true',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  models: {
    chat: process.env.OLLAMA_CHAT_MODEL || 'llama2',
    codeReview: process.env.OLLAMA_CODE_REVIEW_MODEL || 'codellama'
  },
  limits: {
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '4096'),
    maxMessages: parseInt(process.env.OLLAMA_MAX_MESSAGES || '50')
  }
}