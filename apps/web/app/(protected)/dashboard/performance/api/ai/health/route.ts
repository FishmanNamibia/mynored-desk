import { NextResponse } from 'next/server'
import { checkOllamaHealth, listModels } from '@/lib/ollama-service'
import { AI_CONFIG } from '@/lib/ai-config'

export async function GET() {
  try {
    const isHealthy = await checkOllamaHealth()
    
    if (!isHealthy) {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Ollama server is not responding',
        config: {
          baseUrl: AI_CONFIG.OLLAMA_BASE_URL,
          defaultModel: AI_CONFIG.DEFAULT_MODEL,
        },
      }, { status: 503 })
    }

    const models = await listModels()
    const requiredModel = AI_CONFIG.DEFAULT_MODEL
    const modelAvailable = models.some(m => m.includes(requiredModel.split(':')[0]))

    return NextResponse.json({
      status: 'healthy',
      message: 'Ollama server is running',
      config: {
        baseUrl: AI_CONFIG.OLLAMA_BASE_URL,
        defaultModel: AI_CONFIG.DEFAULT_MODEL,
      },
      models: {
        available: models,
        required: requiredModel,
        isReady: modelAvailable,
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check Ollama status',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
