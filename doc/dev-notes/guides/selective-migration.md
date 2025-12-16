# 选择性迁移指南

## 场景

只想迁移部分表到特定数据库（如 `aidb_dev`）。

## 方法 1: 临时移动迁移文件（推荐）

### 步骤

1. **创建临时目录**
```bash
mkdir -p database/migrations/temp
```

2. **移动不需要的迁移文件**
```bash
# 假设只要迁移 categories, tags, posts 三个表
# 移动其他不需要的迁移文件
mv database/migrations/1747048902056_create_users_table.ts database/migrations/temp/
mv database/migrations/1747048902058_create_access_tokens_table.ts database/migrations/temp/
mv database/migrations/1748000000004_create_post_tags_table.ts database/migrations/temp/
```

3. **运行迁移**
```bash
node ace migration:run --connection=aidb_dev
```

4. **恢复迁移文件**
```bash
mv database/migrations/temp/*.ts database/migrations/
rmdir database/migrations/temp
```

## 方法 2: 使用单独的迁移目录

### 步骤

1. **创建专用迁移目录**
```bash
mkdir -p database/migrations/aidb_dev
```

2. **复制需要的迁移文件**
```bash
cp database/migrations/1748000000001_create_categories_table.ts database/migrations/aidb_dev/
cp database/migrations/1748000000002_create_tags_table.ts database/migrations/aidb_dev/
cp database/migrations/1748000000003_create_posts_table.ts database/migrations/aidb_dev/
```

3. **修改数据库配置**

在 `config/database.ts` 中为 `aidb_dev` 添加单独的迁移路径：

```typescript
aidb_dev: {
  client: 'pg',
  connection: {
    // ...
  },
  migrations: {
    naturalSort: true,
    paths: [
      'database/migrations/aidb_dev',  // 专用迁移目录
    ],
  },
}
```

4. **运行迁移**
```bash
node ace migration:run --connection=aidb_dev
```

## 方法 3: 创建新的合并迁移文件

### 步骤

1. **创建新的迁移文件**
```bash
node ace make:migration create_blog_tables_for_aidb_dev --connection=aidb_dev
```

2. **在新文件中合并三个表的创建逻辑**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // 创建 categories 表
    this.schema.createTable('categories', (table) => {
      table.increments('id').notNullable()
      table.string('name', 100).notNullable().unique()
      table.text('description').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    // 创建 tags 表
    this.schema.createTable('tags', (table) => {
      table.increments('id').notNullable()
      table.string('name', 100).notNullable().unique()
      table.text('description').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    // 创建 posts 表
    this.schema.createTable('posts', (table) => {
      table.increments('id').notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.text('excerpt').nullable()
      table.text('content').notNullable()
      table.integer('category_id').unsigned().nullable()
      table.string('image_url', 500).nullable()
      table.string('read_time', 50).nullable()
      table.integer('views').defaultTo(0)
      table.integer('likes').defaultTo(0)
      table.string('author_name', 100).nullable()
      table.string('author_avatar', 500).nullable()
      table.date('date').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()

      table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL')
      table.index('slug')
      table.index('category_id')
      table.index('date')
    })
  }

  async down() {
    this.schema.dropTable('posts')
    this.schema.dropTable('tags')
    this.schema.dropTable('categories')
  }
}
```

3. **运行迁移**
```bash
node ace migration:run --connection=aidb_dev
```

## 方法 4: 使用脚本选择性运行

创建一个脚本，只运行指定的迁移文件：

```bash
#!/bin/bash
# migrate-selected.sh

# 只运行指定的迁移文件
node ace migration:run --connection=aidb_dev \
  --files=1748000000001_create_categories_table.ts,1748000000002_create_tags_table.ts,1748000000003_create_posts_table.ts
```

**注意**：AdonisJS 可能不支持 `--files` 参数，需要检查文档或使用其他方法。

## 推荐方案

### 对于一次性迁移：使用方法 1（临时移动）

简单快速，适合临时需求。

### 对于长期维护：使用方法 2（单独目录）

更清晰，便于管理不同数据库的迁移。

### 对于复杂场景：使用方法 3（合并迁移）

适合需要调整表结构或字段类型的场景。

## 注意事项

1. **外键依赖**：确保按正确顺序创建表（如 posts 依赖 categories）
2. **字段类型兼容性**：PostgreSQL 和 MySQL 的字段类型可能不同
3. **索引和约束**：确保索引和约束语法兼容目标数据库

