# 迁移文件生成指南

## 重要说明

**迁移文件的生成与模型文件的位置无关！**

无论模型文件放在 `app/models/` 还是 `app/models/blog/`，迁移文件的生成方式都是一样的。

## 生成迁移文件

### 方法 1: 使用 Ace 命令（推荐）

```bash
# 生成迁移文件
node ace make:migration create_posts_table

# 或者指定连接
node ace make:migration create_posts_table --connection=mysql
```

命令会提示你输入表名，然后生成迁移文件到 `database/migrations` 目录。

### 方法 2: 手动创建

直接在 `database/migrations` 目录下创建文件，文件名格式：
```
{timestamp}_{description}.ts
```

例如：
```
1748000000001_create_categories_table.ts
```

## 迁移文件位置配置

在 `config/database.ts` 中配置迁移文件路径：

```typescript
mysql: {
  // ...
  migrations: {
    naturalSort: true,
    paths: ['database/migrations'], // 迁移文件目录
  },
}
```

## 按模块组织迁移文件（可选）

如果你想按模块组织迁移文件，可以：

### 方案 1: 使用子目录（推荐）

修改 `config/database.ts`：

```typescript
mysql: {
  // ...
  migrations: {
    naturalSort: true,
    paths: [
      'database/migrations',           // 通用迁移
      'database/migrations/blog',      // 博客相关迁移
      'database/migrations/user',      // 用户相关迁移
    ],
  },
}
```

然后创建对应的目录结构：
```
database/migrations/
├── 1747048902056_create_users_table.ts
├── blog/
│   ├── 1748000000001_create_categories_table.ts
│   ├── 1748000000002_create_tags_table.ts
│   ├── 1748000000003_create_posts_table.ts
│   └── 1748000000004_create_post_tags_table.ts
└── user/
    └── ...
```

### 方案 2: 使用命名约定

保持所有迁移文件在 `database/migrations` 目录，但使用命名约定：

```
database/migrations/
├── 1747048902056_create_users_table.ts
├── 1748000000001_blog_create_categories_table.ts
├── 1748000000002_blog_create_tags_table.ts
├── 1748000000003_blog_create_posts_table.ts
└── 1748000000004_blog_create_post_tags_table.ts
```

## 运行迁移

```bash
# 运行所有迁移
node ace migration:run

# 运行指定连接的迁移
node ace migration:run --connection=mysql

# 回滚迁移
node ace migration:rollback

# 查看迁移状态
node ace migration:status
```

## 最佳实践

1. **迁移文件统一放在 `database/migrations`**
   - 简单明了，易于管理
   - AdonisJS 默认配置

2. **使用有意义的文件名**
   - `create_posts_table.ts`
   - `add_index_to_posts_table.ts`
   - `alter_posts_add_column.ts`

3. **按时间戳排序**
   - 迁移文件会自动按文件名排序执行
   - 使用 `naturalSort: true` 确保正确排序

4. **模型文件可以按模块组织**
   - `app/models/blog/post.ts`
   - `app/models/user/user.ts`
   - 迁移文件位置不影响模型组织

## 示例：为博客模块生成新迁移

```bash
# 1. 生成迁移文件
node ace make:migration add_featured_to_posts_table

# 2. 编辑生成的迁移文件
# database/migrations/{timestamp}_add_featured_to_posts_table.ts

# 3. 运行迁移
node ace migration:run --connection=mysql
```

## 总结

- ✅ 模型文件可以放在 `app/models/blog/` 目录
- ✅ 迁移文件统一放在 `database/migrations` 目录
- ✅ 两者互不影响，可以独立组织
- ✅ 使用 `node ace make:migration` 生成迁移文件

