export interface AIConfig {
    OLLAMA_BASE_URL: string;
    DEFAULT_MODEL: string;
    MAX_TOKENS: number;
    TEMPERATURE: number;
    CONTEXT_WINDOW: number;
    TIMEOUT_MS: number;
}
export declare const AI_CONFIG: AIConfig;
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
//# sourceMappingURL=types.d.ts.map