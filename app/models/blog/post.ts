import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Category from './category.js'
import Tag from './tag.js'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare excerpt: string | null

  @column()
  declare content: string

  @column()
  declare categoryId: number | null

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

  @column.date()
  declare date: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @manyToMany(() => Tag, {
    pivotTable: 'post_tags',
  })
  declare tags: ManyToMany<typeof Tag>
}
