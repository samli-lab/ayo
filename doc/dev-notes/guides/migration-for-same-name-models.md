# 为同名模型生成迁移文件

## 场景说明

假设你有两个 Post 模型：
- `app/models/blog/post.ts` - 博客文章
- `app/models/news/post.ts` - 新闻文章

## 解决方案

### 方法 1: 使用不同的表名（推荐）

#### 步骤 1: 生成迁移文件

```bash
# 为博客 Post 生成迁移
node ace make:migration create_blog_posts_table --connection=mysql

# 为新闻 Post 生成迁移
node ace make:migration create_news_posts_table --connection=mysql
```

#### 步骤 2: 编辑迁移文件

**博客 Post 迁移文件：**
```typescript
// database/migrations/1748000000001_create_blog_posts_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'blog_posts'  // 使用 blog_posts 作为表名

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.text('content').notNullable()
      table.integer('category_id').unsigned().nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      
      table.foreign('category_id').references('id').inTable('blog_categories').onDelete('SET NULL')
      table.index('slug')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

**新闻 Post 迁移文件：**
```typescript
// database/migrations/1748000000002_create_news_posts_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'news_posts'  // 使用 news_posts 作为表名

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.text('content').notNullable()
      table.integer('category_id').unsigned().nullable()
      table.string('source', 255).nullable()  // 新闻特有的字段
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      
      table.foreign('category_id').references('id').inTable('news_categories').onDelete('SET NULL')
      table.index('slug')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

#### 步骤 3: 在模型中指定表名

**博客 Post 模型：**
```typescript
// app/models/blog/post.ts
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Post extends BaseModel {
  static connection = 'mysql'
  static table = 'blog_posts'  // 指定表名

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  // ... 其他字段
}
```

**新闻 Post 模型：**
```typescript
// app/models/news/post.ts
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Post extends BaseModel {
  static connection = 'mysql'
  static table = 'news_posts'  // 指定表名

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare source: string | null  // 新闻特有字段

  // ... 其他字段
}
```

#### 步骤 4: 在控制器中使用

```typescript
// app/controllers/blog/blog_controller.ts
import BlogPost from '#models/blog/post'  // 使用完整路径区分

export default class BlogController {
  async getPosts() {
    const posts = await BlogPost.query().all()
    // 实际查询的是 blog_posts 表
  }
}

// app/controllers/news/news_controller.ts
import NewsPost from '#models/news/post'  // 使用完整路径区分

export default class NewsController {
  async getPosts() {
    const posts = await NewsPost.query().all()
    // 实际查询的是 news_posts 表
  }
}
```

## 完整示例流程

### 1. 创建博客相关迁移

```bash
# 创建分类表
node ace make:migration create_blog_categories_table --connection=mysql

# 创建文章表
node ace make:migration create_blog_posts_table --connection=mysql

# 创建标签表
node ace make:migration create_blog_tags_table --connection=mysql

# 创建关联表
node ace make:migration create_blog_post_tags_table --connection=mysql
```

### 2. 创建新闻相关迁移

```bash
# 创建分类表
node ace make:migration create_news_categories_table --connection=mysql

# 创建文章表
node ace make:migration create_news_posts_table --connection=mysql
```

### 3. 文件结构

```
database/migrations/
├── 1748000000001_create_blog_categories_table.ts
├── 1748000000002_create_blog_posts_table.ts
├── 1748000000003_create_blog_tags_table.ts
├── 1748000000004_create_blog_post_tags_table.ts
├── 1748000000005_create_news_categories_table.ts
└── 1748000000006_create_news_posts_table.ts
```

### 4. 模型文件结构

```
app/models/
├── blog/
│   ├── post.ts          (table: 'blog_posts')
│   ├── category.ts      (table: 'blog_categories')
│   └── tag.ts           (table: 'blog_tags')
└── news/
    ├── post.ts          (table: 'news_posts')
    └── category.ts      (table: 'news_categories')
```

## 命名规范建议

### 迁移文件命名

使用模块前缀：
- `create_blog_posts_table.ts`
- `create_news_posts_table.ts`
- `add_featured_to_blog_posts_table.ts`
- `add_source_to_news_posts_table.ts`

### 表名命名

使用模块前缀：
- `blog_posts`
- `news_posts`
- `blog_categories`
- `news_categories`

### 模型类名

可以保持相同（使用完整路径区分）：
- `app/models/blog/post.ts` → `class Post`
- `app/models/news/post.ts` → `class Post`

或者使用不同类名（更清晰）：
- `app/models/blog/post.ts` → `class BlogPost`
- `app/models/news/post.ts` → `class NewsPost`

## 注意事项

1. **表名必须不同**
   - `blog_posts` 和 `news_posts` 是不同的表
   - 在模型中必须使用 `static table` 指定

2. **外键关联**
   - 博客 Post 关联 `blog_categories`
   - 新闻 Post 关联 `news_categories`
   - 确保外键表名正确

3. **迁移执行顺序**
   - 先创建被依赖的表（如 categories）
   - 再创建依赖表（如 posts）

4. **导入路径**
   - 使用完整路径：`#models/blog/post`
   - 使用完整路径：`#models/news/post`

## 总结

✅ **迁移文件命名**：使用前缀区分
- `create_blog_posts_table`
- `create_news_posts_table`

✅ **表名**：使用前缀区分
- `blog_posts`
- `news_posts`

✅ **模型文件**：使用 `static table` 指定表名

✅ **导入**：使用完整路径区分
- `import BlogPost from '#models/blog/post'`
- `import NewsPost from '#models/news/post'`

