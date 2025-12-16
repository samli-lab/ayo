import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.text('excerpt').nullable()
      table.text('content').notNullable() // Markdown 格式内容
      table.integer('category_id').unsigned().nullable()
      table.string('image_url', 500).nullable()
      table.string('read_time', 50).nullable() // 如 "5 min read"
      table.integer('views').defaultTo(0)
      table.integer('likes').defaultTo(0)
      table.string('author_name', 100).nullable()
      table.string('author_avatar', 500).nullable()
      table.date('date').notNullable() // 发布日期 YYYY-MM-DD
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL')
      table.index('slug')
      table.index('category_id')
      table.index('date')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
