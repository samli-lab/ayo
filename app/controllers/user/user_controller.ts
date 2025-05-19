import type { HttpContext } from '@adonisjs/core/http'
import type { UserValidation } from '#validators/user_validator'

export default class UserController {
  public async index(ctx: HttpContext) {
    const { name, age } = ctx.data as UserValidation
    return ctx.response.json({
      message: '验证成功',
      data: { name, age },
    })
  }
}
