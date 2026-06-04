import { ChatMessage, ChatCompletionRequest } from './types';
export declare class OllamaService {
    private baseUrl;
    private defaultModel;
    private timeout;
    constructor(config?: import("./types").AIConfig);
    /**
     * Check if Ollama service is available
     */
    healthCheck(): Promise<{
        available: boolean;
        error?: string;
    }>;
    /**
     * Get available models from Ollama
     */
    getModels(): Promise<{
        models: string[];
        error?: string;
    }>;
    /**
     * Send a chat completion request to Ollama
     */
    chat(messages: ChatMessage[], options?: Partial<ChatCompletionRequest>): Promise<{
        response?: string;
        error?: string;
        metadata?: any;
    }>;
    /**
     * Simple text generation for quick queries
     */
    generate(prompt: string, systemPrompt?: string, options?: Partial<ChatCompletionRequest>): Promise<{
        response?: string;
        error?: string;
    }>;
    /**
     * Performance-specific AI assistance
     */
    getPerformanceInsight(context: {
        type: 'goal_suggestion' | 'performance_feedback' | 'rating_analysis' | 'development_plan';
        data: any;
        userRole?: string;
        department?: string;
    }): Promise<{
        insight?: string;
        error?: string;
    }>;
}
export declare const ollamaService: OllamaService;
//# sourceMappingURL=ollama.service.d.ts.map