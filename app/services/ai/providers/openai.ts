import OpenAI from 'openai'
import {
  AIModelConfig,
  AIModelService,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Message,
  MessagePart,
} from '../types.js'

function toOpenAIContent(content: string | MessagePart[]): any {
  if (typeof content === 'string') return content

  const parts: any[] = []
  for (const p of content) {
    if (p.text) parts.push({ type: 'text', text: p.text })
    if (p.inlineData) {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` },
      })
    }
  }

  return parts.length > 0 ? parts : ''
}

function toOpenAIMessages(messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((m) => {
    if (m.role === 'system') {
      const content = typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join('')
      return { role: 'system', content }
    }

    if (m.role === 'user') {
      return { role: 'user', content: toOpenAIContent(m.content) }
    }

    if (m.role === 'assistant') {
      const content = typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join('')
      return {
        role: 'assistant',
        content,
        tool_calls: m.tool_calls as any,
      }
    }

    // tool
    return {
      role: 'tool',
      content: typeof m.content === 'string' ? m.content : m.content.map((p) => p.text ?? '').join(''),
      tool_call_id: m.tool_call_id!,
    } as any
  })
}

export class OpenAIService implements AIModelService {
  private client: OpenAI
  private model: string

  constructor(config: AIModelConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.openai.com/v1',
    })
    this.model = config.model
  }

  async generateCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: toOpenAIMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      seed: request.seed,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
    })

    return {
      content: completion.choices[0].message.content || '',
      model: this.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
    }
  }
}
