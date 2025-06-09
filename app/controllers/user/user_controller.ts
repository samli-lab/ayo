import type { HttpContext } from '@adonisjs/core/http'
import { translationValidator } from '#validators/user_validator'

export default class UserController {
  /**
   * @index
   * @summary 获取用户信息
   * @description 获取用户信息的API，这是一个详细的描述
   * @requestBody {"name": "John", "age": 20}
   * @responseBody 200 - {"message": "验证成功", "data": {"id": 1}}
   */
  public async index(ctx: HttpContext) {
    return ctx.response.json({
      message: '验证成功',
      data: { id: 1 },
    })
  }

  /**
   * @test
   * @summary 获取用户信息
   * @description 获取用户信息的API，这是一个详细的描述
   * @paramQuery foo - Describe the query param - @type(string) @required
   * @responseBody 200 - {"message": "验证成功", "data": {"id": 1}}
   */
  public async test(ctx: HttpContext) {
    const greeting = ctx.i18n.t('messages.greeting')
    return ctx.response.json({
      message: greeting,
      data: { id: 1 },
    })
  }
}
