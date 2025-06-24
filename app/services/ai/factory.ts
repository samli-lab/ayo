import { AIModelConfig, AIModelService } from './types.js'
import { OpenAIService } from './providers/openai.js'
import { GeminiService } from './providers/gemini.js'
import { OpenRouterService } from './providers/openrouter.js'
import { DeepSeekService } from './providers/deepseek.js'

export class AIServiceFactory {
  private static providers = new Map<
    string,
    typeof OpenAIService | typeof GeminiService | typeof OpenRouterService | typeof DeepSeekService
  >()

  static {
    AIServiceFactory.providers.set('openai', OpenAIService)
    AIServiceFactory.providers.set('gemini', GeminiService)
    AIServiceFactory.providers.set('openrouter', OpenRouterService)
    AIServiceFactory.providers.set('deepseek', DeepSeekService)
  }

  static createService(
    config: AIModelConfig,
    options?: {
      seed?: number
      topP?: number
      topK?: number
      frequencyPenalty?: number
      presencePenalty?: number
      temperature?: number
      maxTokens?: number
    }
  ): AIModelService {
    const Provider = this.providers.get(config.provider.toLowerCase())
    if (!Provider) {
      throw new Error(`Unsupported AI provider: ${config.provider}`)
    }

    // 合并配置选项
    const mergedConfig: AIModelConfig = {
      ...config,
      ...options,
    }

    return new Provider(mergedConfig)
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}
