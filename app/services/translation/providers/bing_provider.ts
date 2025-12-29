import { BaseTranslationProvider } from './base_provider.js'
import { TranslationResult } from '../types.js'

interface BingTranslationResponse {
  translations: Array<{
    text: string
    to: string
  }>
}

export class BingTranslationProvider extends BaseTranslationProvider {
  private apiKey: string
  private endpoint: string

  constructor(apiKey: string, endpoint: string = 'https://api.bing.microsoft.com/v7.0/translate') {
    super('bing')
    this.apiKey = apiKey
    this.endpoint = endpoint
  }

  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          from,
          to: [to],
        }),
      })

      if (!response.ok) {
        throw new Error(`Bing API error: ${response.statusText}`)
      }

      const data = (await response.json()) as BingTranslationResponse
      const translatedText = data.translations[0].text

      this.updateStats(true)
      return {
        text: translatedText,
        provider: this.name,
        success: true,
      }
    } catch (error) {
      this.updateStats(false)
      return {
        text: '',
        provider: this.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
