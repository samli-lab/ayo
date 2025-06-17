import { AIModelConfig, AIModelService } from './types.js'
import { OpenAIService } from './providers/openai.js'
import { GeminiService } from './providers/gemini.js'

export class AIServiceFactory {
  private static providers = new Map<string, typeof OpenAIService | typeof GeminiService>()

  static {
    AIServiceFactory.providers.set('openai', OpenAIService)
    AIServiceFactory.providers.set('gemini', GeminiService)
  }

  static createService(config: AIModelConfig): AIModelService {
    const Provider = this.providers.get(config.provider.toLowerCase())
    if (!Provider) {
      throw new Error(`Unsupported AI provider: ${config.provider}`)
    }
    return new Provider(config)
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}
