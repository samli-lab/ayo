import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Category from './category.js'
import Tag from './tag.js'
import { randomUUID } from 'node:crypto'

export default class Post extends BaseModel {
  public static table = 'blog_post'

  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @beforeCreate()
  public static async assignUuid(post: Post) {
    post.id = randomUUID()
  }

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare excerpt: string | null

  @column()
  declare content: string

  @column()
  declare categoryId: string | null

  @column()
  declare imageUrl: string | null

  @column()
  declare readTime: string | null

  @column()
  declare views: number

  @column()
  declare likes: number

  @column()
  declare authorName: string | null

  @column()
  declare authorAvatar: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @manyToMany(() => Tag, {
    pivotTable: 'blog_post_tag',
    pivotTimestamps: true,
  })
  declare tags: ManyToMany<typeof Tag>
}
