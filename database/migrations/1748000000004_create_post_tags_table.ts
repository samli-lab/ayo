import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_tags'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('post_id').unsigned().notNullable()
      table.integer('tag_id').unsigned().notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.foreign('post_id').references('id').inTable('posts').onDelete('CASCADE')
      table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE')
      table.unique(['post_id', 'tag_id'])
      table.index('post_id')
      table.index('tag_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
