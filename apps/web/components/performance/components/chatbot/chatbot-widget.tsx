'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Minimize2, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  isError?: boolean
}

const GREETING_MESSAGE = "Hello! I'm your AI assistant for the Tasks Implementation Monitoring system. ✨\n\nI can help you with:\n• Creating and managing performance agreements\n• Understanding task workflows\n• Navigating the system\n• Interpreting dashboard statistics\n• Best practices for goal setting\n\nAsk me anything!"

export function ChatbotWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: GREETING_MESSAGE,
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check AI health on mount
  useEffect(() => {
    checkAIHealth()
  }, [])

  const checkAIHealth = async () => {
    try {
      const response = await fetch('/api/ai/health')
      const data = await response.json()
      setAiStatus(data.status === 'healthy' ? 'ready' : 'error')
    } catch (error) {
      // Silently fail - AI service may not be configured
      setAiStatus('error')
    }
  }

  const generateAIResponse = async (userInput: string): Promise<string> => {
    try {
      // Get current page context
      const pageContext = pathname ? pathname.split('/').pop() || 'dashboard' : 'dashboard'
      
      const response = await fetch('/dashboard/performance/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.filter(m => m.sender !== 'bot' || m.id === '1').slice(-5), // Send last 5 messages
          context: {
            page: pageContext,
            additionalInfo: `User is currently on the ${pageContext} page`,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      return data.message || data.fallback || "I'm having trouble right now. Please try again."
    } catch (error) {
      console.error('AI response error:', error)
      
      // Fallback to helpful message
      if (aiStatus === 'error') {
        return "⚠️ AI service is currently unavailable. The system administrator may need to start the Ollama server.\n\nIn the meantime, you can:\n• Navigate using the sidebar menu\n• Check the documentation\n• Contact your supervisor for help"
      }
      
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment."
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    const currentInput = inputValue
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      // Get AI response
      const aiResponse = await generateAIResponse(currentInput)
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botResponse])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:bg-white hover:text-primary group"
        aria-label="Open AI chat"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400 group-hover:text-yellow-500" />
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex w-96 flex-col rounded-lg border bg-background shadow-2xl transition-all',
        isMinimized ? 'h-14' : 'h-[600px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            {aiStatus === 'ready' && (
              <span className="text-xs opacity-75 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </span>
            )}
            {aiStatus === 'error' && (
              <span className="text-xs opacity-75 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2 text-sm transition-colors',
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground hover:bg-white hover:text-primary'
                      : message.isError
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  <p className="whitespace-pre-line">{message.text}</p>
                  <span className="mt-1 block text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-sm">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
