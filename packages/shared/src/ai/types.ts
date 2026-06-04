export interface AIConfig {
  OLLAMA_BASE_URL: string;
  DEFAULT_MODEL: string;
  MAX_TOKENS: number;
  TEMPERATURE: number;
  CONTEXT_WINDOW: number;
  TIMEOUT_MS: number;
}

export const AI_CONFIG: AIConfig = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
  MAX_TOKENS: parseInt(process.env.OLLAMA_MAX_TOKENS || '2048'),
  TEMPERATURE: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
  CONTEXT_WINDOW: parseInt(process.env.OLLAMA_CONTEXT_WINDOW || '4096'),
  TIMEOUT_MS: parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000'),
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  message: string;
  model: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  context?: number[];
}