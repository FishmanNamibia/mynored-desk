import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { ollamaService } from '../../../../../packages/shared/src/ai';

@Controller('ai')
@UseGuards(SessionGuard)
export class AiController {
  @Get('health')
  async healthCheck() {
    const health = await ollamaService.healthCheck();
    return {
      service: 'Ollama',
      ...health,
      timestamp: new Date(),
    };
  }

  @Get('models')
  async getModels() {
    const result = await ollamaService.getModels();
    return {
      ...result,
      timestamp: new Date(),
    };
  }

  @Post('chat')
  async chat(@Body() body: { 
    message: string; 
    context?: string; 
    systemPrompt?: string;
    model?: string;
  }) {
    const { message, context, systemPrompt, model } = body;
    
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    if (context) {
      messages.push({ role: 'system', content: `Context: ${context}` });
    }
    
    messages.push({ role: 'user', content: message });

    const result = await ollamaService.chat(messages as any, { model });
    
    return {
      response: result.response,
      error: result.error,
      metadata: result.metadata,
      timestamp: new Date(),
    };
  }

  @Post('performance-insight')
  async getPerformanceInsight(@Body() body: {
    type: 'goal_suggestion' | 'performance_feedback' | 'rating_analysis' | 'development_plan';
    data: any;
    context?: string;
  }) {
    const { type, data, context } = body;

    const insight = await ollamaService.getPerformanceInsight({
      type,
      data,
      userRole: context || 'Employee',
      department: 'Unknown',
    });

    return {
      type,
      insight: insight.insight,
      error: insight.error,
      timestamp: new Date(),
    };
  }

  @Post('generate')
  async generate(@Body() body: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
  }) {
    const { prompt, systemPrompt, model, temperature } = body;

    const result = await ollamaService.generate(prompt, systemPrompt, {
      model,
      temperature,
    });

    return {
      prompt,
      response: result.response,
      error: result.error,
      timestamp: new Date(),
    };
  }
}