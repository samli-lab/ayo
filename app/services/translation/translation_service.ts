import {
  TranslationProvider,
  TranslationResult,
  TranslationOptions,
  TranslationStats,
} from './types.js'
import { BingTranslationProvider } from './providers/bing_provider.js'
import { BaiduTranslationProvider } from './providers/baidu_provider.js'
import env from '#start/env'

interface ProviderConfig {
  name: string
  createProvider: () => TranslationProvider | null
}

export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map()
  private defaultRetryCount = 3
  private static instance: TranslationService

  private readonly providerConfigs: ProviderConfig[] = [
    {
      name: 'bing',
      createProvider: () => {
        const apiKey = env.get('BING_TRANSLATION_API_KEY')
        return apiKey ? new BingTranslationProvider(apiKey) : null
      },
    },
    {
      name: 'baidu',
      createProvider: () => {
        const appId = env.get('BAIDU_TRANSLATION_APP_ID')
        const appSecret = env.get('BAIDU_TRANSLATION_APP_SECRET')
        return appId && appSecret ? new BaiduTranslationProvider(appId, appSecret) : null
      },
    },
  ]

  private constructor() {
    this.initializeProviders()
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService()
    }
    return TranslationService.instance
  }

  private initializeProviders() {
    let initializedCount = 0

    for (const config of this.providerConfigs) {
      try {
        const provider = config.createProvider()
        if (provider) {
          this.registerProvider(provider)
          initializedCount++
        } else {
          console.warn(`${config.name} translation provider not configured`)
        }
      } catch (error) {
        console.error(`Failed to initialize ${config.name} translation provider:`, error)
      }
    }

    if (initializedCount === 0) {
      console.error(
        'No translation providers were initialized. Please check your environment configuration.'
      )
    }
  }

  registerProvider(provider: TranslationProvider) {
    this.providers.set(provider.name, provider)
  }

  async translate(text: string, options: TranslationOptions = {}): Promise<TranslationResult> {
    if (this.providers.size === 0) {
      return {
        text: '',
        provider: 'none',
        success: false,
        error: 'No translation providers available. Please check your environment configuration.',
      }
    }

    const {
      from = 'auto',
      to = 'en',
      retryCount = this.defaultRetryCount,
      preferredProvider,
    } = options

    // If a preferred provider is specified, try it first
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const result = await this.tryTranslateWithProvider(text, from, to, preferredProvider)
      return result
    }

    // Sort providers by weight
    const sortedProviders = Array.from(this.providers.values()).sort((a, b) => b.weight - a.weight)
    let lastError: string | undefined

    // Try all providers
    for (let attempt = 0; attempt < retryCount; attempt++) {
      for (const provider of sortedProviders) {
        try {
          const result = await provider.translate(text, from, to)
          if (result.success) return result
          lastError = result.error
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return {
      text: '',
      provider: 'none',
      success: false,
      error: lastError || 'All translation attempts failed',
    }
  }

  private async tryTranslateWithProvider(
    text: string,
    from: string,
    to: string,
    providerName: string
  ): Promise<TranslationResult> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }
    return provider.translate(text, from, to)
  }

  getStats(): TranslationStats[] {
    return Array.from(this.providers.values()).map((provider) => ({
      provider: provider.name,
      weight: provider.weight,
      successRate: provider.getSuccessRate(),
      totalRequests: provider.totalCount,
      successfulRequests: provider.successCount,
    }))
  }
}
