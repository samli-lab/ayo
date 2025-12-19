import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Post from './post.js'
import { randomUUID } from 'node:crypto'

export default class Tag extends BaseModel {
  public static table = 'blog_tag'

  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  public static async assignUuid(tag: Tag) {
    tag.id = randomUUID()
  }

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @manyToMany(() => Post, {
    pivotTable: 'blog_post_tag',
  })
  declare posts: ManyToMany<typeof Post>
}
