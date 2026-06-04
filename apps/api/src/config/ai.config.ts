import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '2048'),
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
    contextWindow: parseInt(process.env.OLLAMA_CONTEXT_WINDOW || '4096'),
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000'),
  },
  features: {
    enabled: process.env.AI_ENABLED !== 'false',
    performanceInsights: process.env.AI_PERFORMANCE_INSIGHTS !== 'false',
    chatAssistant: process.env.AI_CHAT_ASSISTANT !== 'false',
    goalSuggestions: process.env.AI_GOAL_SUGGESTIONS !== 'false',
  },
}));