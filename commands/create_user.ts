import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class CreateUser extends BaseCommand {
  static commandName = 'create:user'
  static description = '创建一个新用户'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: true,
    staysAlive: false,
  }

  @args.string({ description: '用户邮箱', required: true })
  declare email: string

  @args.string({ description: '用户密码', required: true })
  declare password: string

  @flags.string({ description: '用户全名', alias: 'n' })
  declare fullName?: string

  async run() {
    try {
      // 检查邮箱是否已存在
      const existingUser = await User.findBy('email', this.email)
      if (existingUser) {
        this.logger.error(`用户邮箱 ${this.email} 已存在`)
        return
      }

      // 创建用户
      const user = await User.create({
        email: this.email,
        password: this.password,
        fullName: this.fullName || null,
      })

      this.logger.success(`用户创建成功！`)
      this.logger.info(`ID: ${user.id}`)
      this.logger.info(`邮箱: ${user.email}`)
      this.logger.info(`全名: ${user.fullName || '(未设置)'}`)
    } catch (error) {
      this.logger.error(`创建用户失败: ${error.message}`)
      throw error
    }
  }
}

