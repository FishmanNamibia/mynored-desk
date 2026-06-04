import { Ollama } from 'ollama'
import { AI_CONFIG, getConfigForTask } from './ai-config'

// Initialize Ollama client
const ollama = new Ollama({
  host: AI_CONFIG.OLLAMA_BASE_URL,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerateOptions {
  model?: string
  temperature?: number
  num_predict?: number
  top_p?: number
  top_k?: number
}

/**
 * Generate a chat completion using Ollama
 */
export async function generateChat(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  try {
    const model = options.model || AI_CONFIG.DEFAULT_MODEL
    const config = getConfigForTask('chatbot')

    const response = await ollama.chat({
      model,
      messages,
      options: {
        temperature: options.temperature ?? config.temperature,
        num_predict: options.num_predict ?? config.num_predict,
        top_p: options.top_p ?? config.top_p,
        top_k: options.top_k ?? config.top_k,
      },
    })

    return response.message.content
  } catch (error) {
    console.error('Ollama chat error:', error)
    throw new Error('Failed to generate AI response')
  }
}

/**
 * Generate a chat completion with streaming
 */
export async function* generateChatStream(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): AsyncGenerator<string> {
  try {
    const model = options.model || AI_CONFIG.DEFAULT_MODEL
    const config = getConfigForTask('chatbot')

    const stream = await ollama.chat({
      model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature ?? config.temperature,
        num_predict: options.num_predict ?? config.num_predict,
        top_p: options.top_p ?? config.top_p,
        top_k: options.top_k ?? config.top_k,
      },
    })

    for await (const chunk of stream) {
      if (chunk.message?.content) {
        yield chunk.message.content
      }
    }
  } catch (error) {
    console.error('Ollama stream error:', error)
    throw new Error('Failed to generate AI stream')
  }
}

/**
 * Generate a simple text completion
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  try {
    const model = options.model || AI_CONFIG.DEFAULT_MODEL
    const config = getConfigForTask('chatbot')

    const response = await ollama.generate({
      model,
      prompt,
      options: {
        temperature: options.temperature ?? config.temperature,
        num_predict: options.num_predict ?? config.num_predict,
        top_p: options.top_p ?? config.top_p,
        top_k: options.top_k ?? config.top_k,
      },
    })

    return response.response
  } catch (error) {
    console.error('Ollama generate error:', error)
    throw new Error('Failed to generate text')
  }
}

/**
 * Check if Ollama server is running and accessible
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await ollama.list()
    return true
  } catch (error) {
    console.error('Ollama health check failed:', error)
    return false
  }
}

/**
 * List available models
 */
export async function listModels(): Promise<string[]> {
  try {
    const response = await ollama.list()
    return response.models.map((m) => m.name)
  } catch (error) {
    console.error('Failed to list models:', error)
    return []
  }
}

/**
 * Pull a model from Ollama library
 */
export async function pullModel(modelName: string): Promise<void> {
  try {
    console.log(`Pulling model: ${modelName}`)
    await ollama.pull({ model: modelName, stream: false })
    console.log(`Successfully pulled model: ${modelName}`)
  } catch (error) {
    console.error(`Failed to pull model ${modelName}:`, error)
    throw error
  }
}
