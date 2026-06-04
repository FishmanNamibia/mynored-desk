import { AI_CONFIG, ChatMessage, ChatResponse, ChatCompletionRequest } from './types';

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;

  constructor(config = AI_CONFIG) {
    this.baseUrl = config.OLLAMA_BASE_URL;
    this.defaultModel = config.DEFAULT_MODEL;
    this.timeout = config.TIMEOUT_MS;
  }

  /**
   * Check if Ollama service is available
   */
  async healthCheck(): Promise<{ available: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { available: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { available: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { available: false, error: 'Request timed out' };
        }
        return { available: false, error: error.message };
      }
      return { available: false, error: 'Unknown error occurred' };
    }
  }

  /**
   * Get available models from Ollama
   */
  async getModels(): Promise<{ models: string[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { models: [], error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      return { models };
    } catch (error) {
      if (error instanceof Error) {
        return { models: [], error: error.message };
      }
      return { models: [], error: 'Unknown error occurred' };
    }
  }

  /**
   * Send a chat completion request to Ollama
   */
  async chat(
    messages: ChatMessage[],
    options: Partial<ChatCompletionRequest> = {}
  ): Promise<{ response?: string; error?: string; metadata?: any }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const payload: ChatCompletionRequest = {
        model: options.model || this.defaultModel,
        messages: messages,
        temperature: options.temperature || AI_CONFIG.TEMPERATURE,
        stream: false,
        ...options,
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data: ChatResponse = await response.json();
      
      return {
        response: data.message,
        metadata: {
          model: data.model,
          total_duration: data.total_duration,
          eval_count: data.eval_count,
          eval_duration: data.eval_duration,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { error: 'Request timed out' };
        }
        return { error: error.message };
      }
      return { error: 'Unknown error occurred' };
    }
  }

  /**
   * Simple text generation for quick queries
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options: Partial<ChatCompletionRequest> = {}
  ): Promise<{ response?: string; error?: string }> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const result = await this.chat(messages, options);
    return { response: result.response, error: result.error };
  }

  /**
   * Performance-specific AI assistance
   */
  async getPerformanceInsight(
    context: {
      type: 'goal_suggestion' | 'performance_feedback' | 'rating_analysis' | 'development_plan';
      data: any;
      userRole?: string;
      department?: string;
    }
  ): Promise<{ insight?: string; error?: string }> {
    const systemPrompts = {
      goal_suggestion: `You are a performance management expert. Help create SMART goals based on the provided context. Focus on specific, measurable, achievable, relevant, and time-bound objectives.`,
      performance_feedback: `You are a performance management expert. Provide constructive feedback based on performance data. Be specific, actionable, and professional.`,
      rating_analysis: `You are a performance management expert. Analyze performance ratings and provide insights on strengths, areas for improvement, and recommendations.`,
      development_plan: `You are a performance management expert. Create development plans based on performance assessments. Focus on skill gaps, growth opportunities, and career progression.`,
    };

    const prompt = `Context: ${JSON.stringify(context.data, null, 2)}
    
    User Role: ${context.userRole || 'Not specified'}
    Department: ${context.department || 'Not specified'}
    
    Please provide insights based on the above context.`;

    const result = await this.generate(
      prompt,
      systemPrompts[context.type],
      { temperature: 0.6, max_tokens: 1024 }
    );

    return { insight: result.response, error: result.error };
  }
}

// Export singleton instance
export const ollamaService = new OllamaService();