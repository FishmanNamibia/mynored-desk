import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").required(),
  API_PORT: Joi.number().default(3000),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  REDIS_PASSWORD: Joi.string().allow("").optional(),
  CORS_ORIGIN: Joi.string().required(),
  AZURE_TENANT_ID: Joi.string().optional(),
  AZURE_CLIENT_ID: Joi.string().optional(),
  AZURE_CLIENT_SECRET: Joi.string().optional(),
  // AI Configuration
  OLLAMA_BASE_URL: Joi.string().default("http://localhost:11434"),
  OLLAMA_DEFAULT_MODEL: Joi.string().default("llama3.2"),
  OLLAMA_MAX_TOKENS: Joi.number().default(2048),
  OLLAMA_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  OLLAMA_CONTEXT_WINDOW: Joi.number().default(4096),
  OLLAMA_TIMEOUT_MS: Joi.number().default(30000),
});
