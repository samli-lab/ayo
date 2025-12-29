# 如何生成迁移文件

## 基本命令

```bash
node ace make:migration create_posts_table
```

## 命令详解

### 命令格式

```bash
node ace make:migration <migration_name> [options]
```

### 参数说明

- `<migration_name>`: 迁移文件名（必需）
  - 格式：使用下划线命名，如 `create_posts_table`
  - 会自动添加时间戳前缀

### 可选参数

```bash
# 指定数据库连接
node ace make:migration create_posts_table --connection=mysql

# 查看帮助
node ace make:migration --help
```

## 完整流程示例

### 步骤 1: 生成迁移文件

```bash
node ace make:migration create_posts_table
```

**输出示例：**
```
✔ create  database/migrations/1748123456789_create_posts_table.ts
```

### 步骤 2: 编辑迁移文件

生成的文件内容：

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    }
}
```

### 步骤 3: 完善迁移文件

根据你的需求修改：

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
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
      
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // 外键约束
      table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL')
      
      // 索引
      table.index('slug')
      table.index('category_id')
      table.index('date')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 步骤 4: 运行迁移

```bash
# 运行迁移
node ace migration:run

# 或指定连接
node ace migration:run --connection=mysql

# 查看迁移状态
node ace migration:status
```

## 常见迁移文件命名规范

### 创建表

```bash
node ace make:migration create_posts_table
node ace make:migration create_categories_table
node ace make:migration create_tags_table
```

### 修改表结构

```bash
# 添加列
node ace make:migration add_featured_to_posts_table

# 修改列
node ace make:migration alter_posts_title_column

# 删除列
node ace make:migration remove_excerpt_from_posts_table
```

### 添加索引

```bash
node ace make:migration add_index_to_posts_slug
```

### 创建关联表

```bash
node ace make:migration create_post_tags_table
```

## 迁移文件模板

### 创建表模板

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'table_name'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      // 添加你的字段
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 添加列模板

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('new_column', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('new_column')
    })
  }
}
```

### 添加索引模板

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index('slug')
      table.index(['category_id', 'date']) // 复合索引
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex('slug')
      table.dropIndex(['category_id', 'date'])
    })
  }
}
```

## 字段类型参考

```typescript
// 字符串
table.string('name', 255)           // VARCHAR(255)
table.text('description')            // TEXT

// 数字
table.integer('views')                // INTEGER
table.bigInteger('id')                // BIGINT
table.decimal('price', 10, 2)        // DECIMAL(10,2)
table.float('rating')                 // FLOAT

// 布尔值
table.boolean('is_published')         // BOOLEAN

// 日期时间
table.date('published_at')           // DATE
table.dateTime('created_at')          // DATETIME
table.timestamp('updated_at')         // TIMESTAMP

// JSON
table.json('metadata')                // JSON

// 枚举
table.enum('status', ['draft', 'published'])

// 自增ID
table.increments('id')                // AUTO_INCREMENT PRIMARY KEY
table.bigIncrements('id')             // BIGINT AUTO_INCREMENT
```

## 约束和索引

```typescript
// 唯一约束
table.string('slug').unique()

// 非空约束
table.string('title').notNullable()

// 默认值
table.integer('views').defaultTo(0)

// 外键
table.integer('category_id').unsigned()
table.foreign('category_id')
  .references('id')
  .inTable('categories')
  .onDelete('CASCADE')  // 或 'SET NULL', 'RESTRICT'

// 索引
table.index('slug')
table.index(['category_id', 'date'])  // 复合索引
```

## 注意事项

1. **迁移文件顺序**
   - 文件按时间戳排序执行
   - 确保依赖的表先创建（如外键依赖）

2. **回滚操作**
   - `down()` 方法必须正确实现
   - 确保可以安全回滚

3. **数据迁移**
   - 迁移文件只用于结构变更
   - 数据迁移使用 seeders 或单独脚本

4. **测试迁移**
   ```bash
   # 先回滚测试
   node ace migration:rollback
   
   # 再运行测试
   node ace migration:run
   ```

## 完整示例：创建博客文章表

```bash
# 1. 生成迁移文件
node ace make:migration create_posts_table --connection=mysql

# 2. 编辑文件（参考上面的完整示例）

# 3. 运行迁移
node ace migration:run --connection=mysql

# 4. 验证
node ace migration:status
```

## 故障排查

### 问题：命令找不到

```bash
# 确保在项目根目录
cd /path/to/your/project

# 确保依赖已安装
npm install
# 或
pnpm install
```

### 问题：迁移失败

```bash
# 查看详细错误
node ace migration:run --connection=mysql

# 回滚到上一个版本
node ace migration:rollback

# 查看迁移状态
node ace migration:status
```

## 总结

1. ✅ 使用 `node ace make:migration <name>` 生成文件
2. ✅ 编辑生成的迁移文件，添加字段和约束
3. ✅ 运行 `node ace migration:run` 执行迁移
4. ✅ 使用 `node ace migration:status` 查看状态
5. ✅ 使用 `node ace migration:rollback` 回滚

