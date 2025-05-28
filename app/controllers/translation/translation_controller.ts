import { HttpContext } from '@adonisjs/core/http'
import { TranslationService } from '#services/translation/translation_service'

export default class TranslationController {
  private translationService: TranslationService

  constructor() {
    this.translationService = TranslationService.getInstance()
  }

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

  async getStats({ response }: HttpContext) {
    try {
      const stats = this.translationService.getStats()
      return response.json({ stats })
    } catch (error) {
      return response.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get translation stats',
      })
    }
  }
}
