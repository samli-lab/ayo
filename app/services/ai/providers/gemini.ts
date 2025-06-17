import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js'

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
        await chat.sendMessage(msg.content)
      } else if (msg.role === 'assistant') {
        // 模拟助手回复
        await chat.sendMessage(msg.content)
      }
    }

    // 发送最后一条消息
    const lastMessage = request.messages[request.messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
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
