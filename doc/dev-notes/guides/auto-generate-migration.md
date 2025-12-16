# 从模型自动生成迁移文件

## 功能说明

创建了一个自定义 Ace 命令，可以根据模型文件自动生成迁移文件。

## 使用方法

### 基本用法

```bash
# 从模型文件生成迁移
node ace generate:migration-from-model blog/post

# 指定数据库连接
node ace generate:migration-from-model blog/post --connection=mysql

# 覆盖已存在的迁移文件
node ace generate:migration-from-model blog/post --force
```

### 参数说明

- `modelPath`: 模型文件路径（相对于 `app/models` 目录）
  - 例如：`blog/post` → `app/models/blog/post.ts`
  - 例如：`user` → `app/models/user.ts`

- `--connection` / `-c`: 数据库连接名称（可选）
  - 默认：`mysql`

- `--force` / `-f`: 覆盖已存在的迁移文件（可选）

## 示例

### 示例 1: 为博客 Post 模型生成迁移

```bash
node ace generate:migration-from-model blog/post --connection=mysql
```

**生成的迁移文件：**
```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug').notNullable()
      table.string('title').notNullable()
      table.text('excerpt').nullable()
      table.text('content').notNullable()
      table.integer('category_id').nullable()
      table.string('image_url').nullable()
      table.string('read_time').nullable()
      table.integer('views')
      table.integer('likes')
      table.string('author_name').nullable()
      table.string('author_avatar').nullable()
      table.date('date').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.foreign('category_id').references('id').inTable('categories').onDelete('SET NULL')
      table.index('slug')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### 示例 2: 为 Category 模型生成迁移

```bash
node ace generate:migration-from-model blog/category
```

## 功能特性

### ✅ 自动识别

1. **表名**
   - 优先使用 `static table` 指定的表名
   - 否则使用模型名的复数形式

2. **字段类型**
   - 根据 TypeScript 类型和装饰器自动推断
   - 支持：string, integer, boolean, date, dateTime, text 等

3. **字段属性**
   - 主键：`@column({ isPrimary: true })`
   - 唯一：`@column({ isUnique: true })`
   - 可空：`string | null`
   - 默认值：`@column({ defaultValue: 'xxx' })`

4. **关系**
   - `@belongsTo` → 自动生成外键
   - `@manyToMany` → 识别关联表（需要手动创建关联表迁移）

5. **时间戳**
   - 自动添加 `created_at` 和 `updated_at`（如果不存在）

### ⚠️ 限制

1. **复杂关系**
   - `manyToMany` 的关联表需要手动创建迁移
   - `hasMany` 关系不会生成外键（外键在子表中）

2. **字段长度**
   - 需要手动在迁移文件中调整字段长度

3. **索引**
   - 只自动为唯一字段添加索引
   - 其他索引需要手动添加

4. **默认值**
   - 简单的默认值可以识别
   - 复杂表达式需要手动修改

## 工作流程

### 推荐流程

1. **创建模型文件**
   ```typescript
   // app/models/blog/post.ts
   export default class Post extends BaseModel {
     static connection = 'mysql'
     // ... 字段定义
   }
   ```

2. **生成迁移文件**
   ```bash
   node ace generate:migration-from-model blog/post
   ```

3. **检查并修改迁移文件**
   - 调整字段长度
   - 添加额外的索引
   - 完善外键约束
   - 添加其他约束

4. **运行迁移**
   ```bash
   node ace migration:run --connection=mysql
   ```

## 注意事项

1. **表名规则**
   - 模型名 `Post` → 表名 `posts`（自动复数化）
   - 使用 `static table = 'blog_posts'` 可以自定义表名

2. **字段名转换**
   - `categoryId` → `category_id`（自动转换）
   - `imageUrl` → `image_url`

3. **类型推断**
   - `string` → `table.string()`
   - `number` → `table.integer()`
   - `boolean` → `table.boolean()`
   - `DateTime` → `table.dateTime()`

4. **手动调整**
   - 生成后需要检查并调整：
     - 字段长度（如 `string('slug', 255)`）
     - 默认值表达式
     - 复合索引
     - 其他约束

## 故障排查

### 问题：找不到模型文件

```bash
# 确保路径正确（相对于 app/models）
node ace generate:migration-from-model blog/post
# ✅ 正确：app/models/blog/post.ts

node ace generate:migration-from-model app/models/blog/post
# ❌ 错误：路径不应该包含 app/models
```

### 问题：生成的迁移不完整

这是正常的，因为：
- 复杂的关系需要手动处理
- 字段长度和约束需要根据实际需求调整
- 索引策略需要根据查询需求设计

**建议：**
1. 使用命令生成基础迁移
2. 手动完善迁移文件
3. 检查并测试

## 总结

✅ **优点：**
- 快速生成基础迁移文件
- 减少手动编写的工作量
- 自动处理字段类型和关系

⚠️ **注意：**
- 生成后需要检查和调整
- 复杂场景需要手动处理
- 不是完全自动化的解决方案

**最佳实践：**
1. 使用命令生成基础结构
2. 手动完善和优化
3. 测试迁移文件
4. 提交到版本控制

