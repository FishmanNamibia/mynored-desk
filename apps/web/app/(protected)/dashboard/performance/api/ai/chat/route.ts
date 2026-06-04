import { NextRequest, NextResponse } from 'next/server'
import { generateChat, ChatMessage } from '@/lib/ollama-service'
import { AI_CONFIG } from '@/lib/ai-config'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getAuthenticatedUser(request)
    if (!user?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, firstName: true, lastName: true, role: true },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse request body
    const { messages, context } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      )
    }

    // Add system prompt
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: AI_CONFIG.SYSTEM_PROMPTS.chatbot,
    }

    // Add context if provided (user info, current page, etc.)
    if (context) {
      systemPrompt.content += `\n\nUser Context:\n- Name: ${`${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim()}\n- Role: ${dbUser.role}`
      
      if (context.page) {
        systemPrompt.content += `\n- Current Page: ${context.page}`
      }
      
      if (context.additionalInfo) {
        systemPrompt.content += `\n- Additional Info: ${context.additionalInfo}`
      }
    }

    // Prepare messages for AI
    const aiMessages: ChatMessage[] = [
      systemPrompt,
      ...messages.map((msg: any) => ({
        role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text || msg.content,
      })),
    ]

    // Limit conversation history
    const limitedMessages = [
      aiMessages[0], // Keep system prompt
      ...aiMessages.slice(-AI_CONFIG.MAX_CONVERSATION_HISTORY),
    ]

    // Generate AI response
    const aiResponse = await generateChat(limitedMessages, {
      model: AI_CONFIG.MODELS.CHAT,
    })

    // Log to help assistant (optional)
    try {
      await prisma.helpAssistantLog.create({
        data: {
          userId: user.id,
          question: messages[messages.length - 1].text || '',
          answer: aiResponse,
          category: 'ai_chat',
          metadata: context || {},
        },
      })
    } catch (logError) {
      console.error('Failed to log chat:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      message: aiResponse,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        fallback: "I'm having trouble connecting to the AI service. Please try again or contact support.",
      },
      { status: 500 }
    )
  }
}
