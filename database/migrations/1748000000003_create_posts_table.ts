import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blog_post'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.text('excerpt').nullable()
      table.text('content').notNullable() // Markdown 格式内容
      table.uuid('category_id').nullable()
      table.string('image_url', 500).nullable()
      table.string('read_time', 50).nullable() // 如 "5 min read"
      table.integer('views').defaultTo(0)
      table.integer('likes').defaultTo(0)
      table.string('author_name', 100).nullable()
      table.string('author_avatar', 500).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).nullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()

      table.index('slug')
      table.index('category_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
