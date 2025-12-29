import { Message, ChatCompletionResponse, ChatCompletionRequest } from './types.js'
import { AIServiceFactory } from './factory.js'
import { ModelRegistry } from './model_registry.js'

export class AIService {
  private service: ReturnType<typeof AIServiceFactory.createService>

  constructor(model: string = 'gpt-3.5-turbo') {
    const modelDefinition = ModelRegistry.get(model)
    if (!modelDefinition) {
      throw new Error(
        `Unsupported model: ${model}. Supported models: ${ModelRegistry.getAllKeys().join(', ')}`
      )
    }

    // 验证模型配置
    const validation = ModelRegistry.validate(modelDefinition)
    if (!validation.valid) {
      throw new Error(`Invalid model configuration for "${model}": ${validation.error}`)
    }

    // 转换为 AIModelConfig
    const config = ModelRegistry.toAIModelConfig(modelDefinition)
    this.service = AIServiceFactory.createService(config)
  }

  /**
   * 获取所有支持的模型列表
   */
  static getSupportedModels(): string[] {
    return ModelRegistry.getAllKeys()
  }

  /**
   * 获取模型配置信息
   */
  static getModelInfo(model: string) {
    return ModelRegistry.get(model) || null
  }

  /**
   * 注册新模型（运行时动态注册）
   */
  static registerModel(definition: Parameters<typeof ModelRegistry.register>[0]): void {
    ModelRegistry.register(definition)
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
