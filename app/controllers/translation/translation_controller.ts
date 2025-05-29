import { HttpContext } from '@adonisjs/core/http'
import { TranslationService } from '#services/translation/translation_service'
import { translationValidator } from '#validators/user_validator'

export default class TranslationController {
  private translationService: TranslationService

  constructor() {
    this.translationService = TranslationService.getInstance()
  }

  /**
   * @translate
   * @summary Translate text
   * @description Translate text using specified translation service provider
   * @requestBody <translationValidator>
   * @query {"from": "auto", "to": "en"}
   * @responseBody 200 - {"translatedText": "你好", "provider": "baidu", "stats": {}}
   */
  async translate(ctx: HttpContext) {
    const { text, provider } = ctx.request.body()

    if (!text) {
      return ctx.response.badRequest({
        error: 'Missing required parameters: text and to are required',
      })
    }

    try {
      const result = await this.translationService.translate(text, { preferredProvider: provider })
      if (!result.success) {
        return ctx.response.status(500).json({
          error: result.error || 'Translation failed',
        })
      }

      return ctx.response.json({
        translatedText: result.text,
        provider: result.provider,
        stats: this.translationService.getStats(),
      })
    } catch (error) {
      return ctx.response.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    }
  }
}
