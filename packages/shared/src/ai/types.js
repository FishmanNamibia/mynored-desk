"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CONFIG = void 0;
exports.AI_CONFIG = {
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
    MAX_TOKENS: parseInt(process.env.OLLAMA_MAX_TOKENS || '2048'),
    TEMPERATURE: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
    CONTEXT_WINDOW: parseInt(process.env.OLLAMA_CONTEXT_WINDOW || '4096'),
    TIMEOUT_MS: parseInt(process.env.OLLAMA_TIMEOUT_MS || '30000'),
};
