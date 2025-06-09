import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'

export default class I18nMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const language = ctx.request.header('x-language') || i18nManager.defaultLocale

    ctx.i18n = i18nManager.locale(language)

    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
