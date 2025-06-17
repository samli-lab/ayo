import { AIModelConfig, Message, ChatCompletionResponse, ChatCompletionRequest } from './types.js'
import { AIServiceFactory } from './factory.js'
import env from '#start/env'

export class AIService {
  private static readonly MODEL_PROVIDER_MAP: Record<
    string,
    { provider: string; apiKeyEnv: string; model: string }
  > = {
    'gpt-3.5-turbo': {
      provider: 'openai',
      apiKeyEnv: env.get('OPENAI_API_KEY'),
      model: 'gpt-3.5-turbo',
    },
    'gemini-pro': {
      provider: 'gemini',
      apiKeyEnv: env.get('GEMINI_API_KEY'),
      model: 'gemini-pro',
    },
  }

  private service: ReturnType<typeof AIServiceFactory.createService>

  constructor(model: string = 'gpt-3.5-turbo') {
    const modelConfig = AIService.MODEL_PROVIDER_MAP[model]
    if (!modelConfig) {
      throw new Error(
        `Unsupported model: ${model}. Supported models: ${Object.keys(AIService.MODEL_PROVIDER_MAP).join(', ')}`
      )
    }

    const apiKey = modelConfig.apiKeyEnv
    if (!apiKey) {
      throw new Error(
        `Missing API key for ${model}. Please set ${modelConfig.apiKeyEnv} environment variable.`
      )
    }

    const config: AIModelConfig = {
      provider: modelConfig.provider,
      apiKey: apiKey,
      model: modelConfig.model,
    }
    this.service = AIServiceFactory.createService(config)
  }

  static getSupportedModels(): string[] {
    return Object.keys(AIService.MODEL_PROVIDER_MAP)
  }

  static getModelProvider(
    model: string
  ): { provider: string; apiKeyEnv: string; model: string } | null {
    return AIService.MODEL_PROVIDER_MAP[model] || null
  }

  async chat(message: string, systemPrompt?: string): Promise<string> {
    const messages: Message[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: message })

    const response = await this.service.generateCompletion({ messages })
    return response.content
  }

  async chatWithHistory(messages: Message[]): Promise<ChatCompletionResponse> {
    return await this.service.generateCompletion({ messages })
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return await this.service.generateCompletion(request)
  }
}
