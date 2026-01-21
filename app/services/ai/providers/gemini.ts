import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
  MessagePart,
} from '../types.js'

function toGeminiContent(content: string | MessagePart[]): string | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  if (typeof content === 'string') return content

  return content
    .map((p) => {
      if (p.text) return { text: p.text }
      if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } }
      return null
    })
    .filter((p): p is { text: string } | { inlineData: { mimeType: string; data: string } } => p !== null)
}

export class GeminiService implements AIModelService {
  private client: GoogleGenerativeAI
  private model: string

  constructor(config: AIModelConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey)
    this.model = config.model
  }

  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = this.client.getGenerativeModel({ model: this.model })
    const chat = model.startChat({
      generationConfig: {
        temperature: request.temperature,
      },
    })

    // 处理历史消息
    for (const msg of request.messages.slice(0, -1)) {
      if (msg.role === 'user') {
        await chat.sendMessage(toGeminiContent(msg.content) as any)
      } else if (msg.role === 'assistant') {
        // 模拟助手回复
        await chat.sendMessage(toGeminiContent(msg.content) as any)
      }
    }

    // 发送最后一条消息
    const lastMessage = request.messages[request.messages.length - 1]
    const result = await chat.sendMessage(toGeminiContent(lastMessage.content) as any)
    const response = await result.response

    return {
      content: response.text(),
      model: this.model,
      // Gemini API 目前不提供 token 使用统计
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }
  }
}
