# 同名模型区分指南

## 问题场景

当 `app/models` 目录下不同子目录有同名模型时，如何区分？

例如：
```
app/models/
├── blog/
│   └── post.ts        // BlogPost
└── news/
    └── post.ts        // NewsPost
```

## 解决方案

### 方法 1: 使用完整路径导入（推荐）

使用 `#models/*` 别名，通过完整路径区分：

```typescript
// 导入博客的 Post
import BlogPost from '#models/blog/post'

// 导入新闻的 Post
import NewsPost from '#models/news/post'

// 使用时
const blogPost = await BlogPost.find(1)
const newsPost = await NewsPost.find(1)
```

### 方法 2: 使用导入别名

在导入时给模型起别名：

```typescript
// 方式 1: 使用 as 关键字
import Post as BlogPost from '#models/blog/post'
import Post as NewsPost from '#models/news/post'

// 方式 2: 使用 default import + rename
import BlogPost from '#models/blog/post'
import NewsPost from '#models/news/post'
```

### 方法 3: 重命名模型类（最佳实践）

在模型文件中使用更具描述性的类名：

```typescript
// app/models/blog/post.ts
export default class BlogPost extends BaseModel {
  // ...
}

// app/models/news/post.ts
export default class NewsPost extends BaseModel {
  // ...
}
```

然后导入：

```typescript
import BlogPost from '#models/blog/post'
import NewsPost from '#models/news/post'
```

## 实际示例

### 示例 1: 博客和新闻模块都有 Post 模型

**文件结构：**
```
app/models/
├── blog/
│   ├── post.ts
│   ├── category.ts
│   └── tag.ts
└── news/
    ├── post.ts
    ├── category.ts
    └── article.ts
```

**控制器中使用：**

```typescript
// app/controllers/blog/blog_controller.ts
import BlogPost from '#models/blog/post'
import BlogCategory from '#models/blog/category'

export default class BlogController {
  async getPosts() {
    const posts = await BlogPost.query().preload('category')
    // ...
  }
}

// app/controllers/news/news_controller.ts
import NewsPost from '#models/news/post'
import NewsCategory from '#models/news/category'

export default class NewsController {
  async getPosts() {
    const posts = await NewsPost.query().preload('category')
    // ...
  }
}
```

### 示例 2: 模型之间的关联

如果两个 Post 模型需要相互引用或关联：

```typescript
// app/models/blog/post.ts
import NewsPost from '#models/news/post'

export default class BlogPost extends BaseModel {
  // 关联到新闻文章
  @hasMany(() => NewsPost)
  declare relatedNews: HasMany<typeof NewsPost>
}
```

## 配置说明

在 `package.json` 中的导入配置：

```json
{
  "imports": {
    "#models/*": "./app/models/*.js"
  }
}
```

这个配置支持：
- `#models/post` → `app/models/post.js`
- `#models/blog/post` → `app/models/blog/post.js`
- `#models/news/post` → `app/models/news/post.js`

## 最佳实践建议

### ✅ 推荐做法

1. **使用描述性的类名**
   ```typescript
   // 好的做法
   export default class BlogPost extends BaseModel { }
   export default class NewsPost extends BaseModel { }
   ```

2. **使用完整路径导入**
   ```typescript
   import BlogPost from '#models/blog/post'
   import NewsPost from '#models/news/post'
   ```

3. **在导入时使用别名**
   ```typescript
   import Post as BlogPost from '#models/blog/post'
   ```

### ❌ 不推荐做法

1. **不要使用相同的类名**
   ```typescript
   // 不推荐：两个文件都叫 Post
   // app/models/blog/post.ts
   export default class Post extends BaseModel { }
   
   // app/models/news/post.ts
   export default class Post extends BaseModel { }
   ```

2. **不要使用相对路径导入（除非在同一目录）**
   ```typescript
   // 不推荐：跨目录使用相对路径
   import Post from '../../../models/blog/post'
   ```

## 迁移文件对应

迁移文件与模型文件位置无关，统一放在 `database/migrations`：

```
database/migrations/
├── 1748000000001_create_blog_posts_table.ts
├── 1748000000002_create_news_posts_table.ts
└── ...
```

在迁移文件中，表名可以区分：

```typescript
// database/migrations/1748000000001_create_blog_posts_table.ts
export default class extends BaseSchema {
  protected tableName = 'blog_posts'  // 使用前缀区分
  // ...
}

// database/migrations/1748000000002_create_news_posts_table.ts
export default class extends BaseSchema {
  protected tableName = 'news_posts'  // 使用前缀区分
  // ...
}
```

然后在模型中指定表名：

```typescript
// app/models/blog/post.ts
export default class BlogPost extends BaseModel {
  static table = 'blog_posts'  // 指定表名
  // ...
}

// app/models/news/post.ts
export default class NewsPost extends BaseModel {
  static table = 'news_posts'  // 指定表名
  // ...
}
```

## 总结

- ✅ 使用完整路径 `#models/blog/post` 和 `#models/news/post` 来区分
- ✅ 在导入时使用别名：`import BlogPost from '#models/blog/post'`
- ✅ 在模型类中使用描述性名称：`BlogPost`, `NewsPost`
- ✅ 迁移文件使用表名前缀：`blog_posts`, `news_posts`
- ✅ 模型中使用 `static table` 指定表名

