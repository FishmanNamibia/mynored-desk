import { Ollama } from 'ollama'
import { AI_CONFIG } from './ai-config'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

let ollamaInstance: Ollama | null = null

function getOllamaInstance() {
  if (!ollamaInstance && AI_CONFIG.enabled) {
    ollamaInstance = new Ollama({ host: AI_CONFIG.baseUrl })
  }
  return ollamaInstance
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    if (!AI_CONFIG.enabled) return false
    const ollama = getOllamaInstance()
    if (!ollama) return false
    
    await ollama.list()
    return true
  } catch (error) {
    console.error('Ollama health check failed:', error)
    return false
  }
}

export async function listModels(): Promise<string[]> {
  try {
    if (!AI_CONFIG.enabled) return []
    const ollama = getOllamaInstance()
    if (!ollama) return []
    
    const response = await ollama.list()
    return response.models?.map((model: any) => model.name) || []
  } catch (error) {
    console.error('Failed to list models:', error)
    return []
  }
}

export async function generateChat(
  messages: ChatMessage[], 
  model: string = AI_CONFIG.models.chat
): Promise<string> {
  try {
    if (!AI_CONFIG.enabled) {
      throw new Error('Ollama is not enabled')
    }

    const ollama = getOllamaInstance()
    if (!ollama) {
      throw new Error('Ollama instance not available')
    }

    const response = await ollama.chat({
      model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: false
    })

    return response.message?.content || ''
  } catch (error) {
    console.error('Chat generation failed:', error)
    throw error
  }
}