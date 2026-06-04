export * from './types';
export * from './ollama.service';

// Re-export singleton for easy access
export { ollamaService as ai } from './ollama.service';