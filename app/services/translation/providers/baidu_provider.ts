import { BaseTranslationProvider } from './base_provider.js'
import { TranslationResult } from '../types.js'
import crypto from 'node:crypto'

interface BaiduTranslationResponse {
  trans_result: Array<{
    src: string
    dst: string
  }>
  error_code?: string
  error_msg?: string
}

export class BaiduTranslationProvider extends BaseTranslationProvider {
  private appId: string
  private appSecret: string
  private endpoint: string

  constructor(
    appId: string,
    appSecret: string,
    endpoint: string = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
  ) {
    super('baidu')
    this.appId = appId
    this.appSecret = appSecret
    this.endpoint = endpoint
  }

  private generateSign(text: string, salt: string): string {
    const str = this.appId + text + salt + this.appSecret
    return crypto.createHash('md5').update(str).digest('hex')
  }

  async translate(text: string, from: string, to: string): Promise<TranslationResult> {
    try {
      const salt = Date.now().toString()
      const sign = this.generateSign(text, salt)

      const params = new URLSearchParams({
        q: text,
        from: from === 'auto' ? 'auto' : from,
        to,
        appid: this.appId,
        salt,
        sign,
      })

      const response = await fetch(`${this.endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Baidu API error: ${response.statusText}`)
      }

      const data = (await response.json()) as BaiduTranslationResponse

      if (data.error_code) {
        throw new Error(`Baidu API error: ${data.error_msg || 'Unknown error'}`)
      }

      const translatedText = data.trans_result[0].dst

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
