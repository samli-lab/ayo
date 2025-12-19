import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blog_post_tag'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('post_id').notNullable()
      table.uuid('tag_id').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.primary(['post_id', 'tag_id'])
      table.index('post_id')
      table.index('tag_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
