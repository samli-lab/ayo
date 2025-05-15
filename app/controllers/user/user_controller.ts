import type { HttpContext } from '@adonisjs/core/http'

export default class UserController {
  public async index(ctx: HttpContext) {
    return ctx.response.json({
      message: '验证成功',
      data: ctx.request.all(),
    })
  }
}
