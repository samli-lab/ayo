import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AccessToken extends BaseModel {
  public static table = 'auth_access_token'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare tokenableId: string

  @column()
  declare type: string

  @column()
  declare name: string | null

  @column()
  declare hash: string

  @column()
  declare abilities: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare lastUsedAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null
}
