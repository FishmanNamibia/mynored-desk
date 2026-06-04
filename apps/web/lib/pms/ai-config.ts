/**
 * AI Configuration for Self-Hosted Ollama
 * 
 * Models:
 * - llama3.1:8b (Fast, good for chatbot, 8GB RAM)
 * - llama3.1:70b (Best quality, requires 40GB+ RAM)
 * - mistral:7b (Fast, efficient)
 * - phi3:medium (Lightweight, 14B params)
 */

export const AI_CONFIG = {
  // Ollama server configuration
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  
  // Model selection - change based on your hardware
  // For Mac with 16GB RAM: llama3.1:8b
  // For server with 64GB+ RAM: llama3.1:70b
  DEFAULT_MODEL: process.env.AI_MODEL || 'llama3.1:8b',
  
  // Alternative models for specific tasks
  MODELS: {
    CHAT: 'llama3.1:8b',           // Fast responses for chatbot
    ANALYSIS: 'llama3.1:70b',       // Deep analysis (if hardware allows)
    GENERATION: 'mistral:7b',       // Content generation
    LIGHTWEIGHT: 'phi3:medium',     // Quick tasks
  },
  
  // Generation parameters
  GENERATION_CONFIG: {
    temperature: 0.7,      // Creativity (0=deterministic, 1=creative)
    top_p: 0.9,           // Nucleus sampling
    top_k: 40,            // Top-k sampling
    num_predict: 2048,    // Max tokens to generate
  },
  
  // Specific configs for different use cases
  TASK_CONFIGS: {
    chatbot: {
      temperature: 0.7,
      num_predict: 512,
    },
    reportGeneration: {
      temperature: 0.5,   // More focused
      num_predict: 2048,
    },
    taskCreation: {
      temperature: 0.3,   // Very focused
      num_predict: 256,
    },
    analysis: {
      temperature: 0.4,
      num_predict: 1024,
    },
  },
  
  // System prompts
  SYSTEM_PROMPTS: {
    chatbot: `You are a helpful assistant for the Statistics Implementation Tracking (SIT) system. 
You help users with:
- Creating and managing performance agreements
- Understanding task workflows and approval processes
- Navigating the system
- Interpreting dashboard statistics
- Best practices for goal setting and tracking

Be concise, professional, and actionable. Reference specific features when relevant.`,
    
    taskAnalysis: `You are an expert task management analyst. Analyze the provided data and:
- Identify patterns and trends
- Highlight risks and bottlenecks
- Provide actionable recommendations
- Be specific with numbers and percentages`,
    
    reportWriter: `You are a professional report writer for organizational performance. 
Create clear, structured reports that:
- Start with key highlights
- Use bullet points for readability
- Include specific metrics and percentages
- End with actionable recommendations`,
  },
  
  // Feature flags
  FEATURES: {
    CHATBOT_ENABLED: process.env.AI_CHATBOT_ENABLED !== 'false',
    REPORT_GENERATION: process.env.AI_REPORT_GEN_ENABLED !== 'false',
    TASK_SUGGESTIONS: process.env.AI_TASK_SUGGEST_ENABLED !== 'false',
    PERFORMANCE_ANALYSIS: process.env.AI_ANALYSIS_ENABLED !== 'false',
  },
  
  // Timeout and retry configuration
  REQUEST_TIMEOUT: 60000,  // 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,       // 1 second
  
  // Context limits
  MAX_CONTEXT_LENGTH: 4096,
  MAX_CONVERSATION_HISTORY: 10,  // Messages to keep in chat history
}

// Helper to check if Ollama is configured
export function isAIEnabled(): boolean {
  return AI_CONFIG.FEATURES.CHATBOT_ENABLED
}

// Helper to get model for specific task
export function getModelForTask(task: keyof typeof AI_CONFIG.MODELS): string {
  return AI_CONFIG.MODELS[task] || AI_CONFIG.DEFAULT_MODEL
}

// Helper to get config for specific task
export function getConfigForTask(task: keyof typeof AI_CONFIG.TASK_CONFIGS) {
  return {
    ...AI_CONFIG.GENERATION_CONFIG,
    ...AI_CONFIG.TASK_CONFIGS[task],
  }
}
