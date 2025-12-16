# 后端 API 接口文档

本文档列出了博客项目所需的所有后端接口。

## 基础信息

- **Base URL**: `https://your-api-domain.com/api`
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 1. 获取文章列表（首页/博客列表页）

### 接口信息
- **URL**: `/posts`
- **方法**: `GET`
- **描述**: 获取文章列表，支持分页和筛选

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 6 | 每页数量 |
| category | string | 否 | - | 分类筛选 |
| tag | string | 否 | - | 标签筛选 |
| search | string | 否 | - | 搜索关键词 |

### 请求示例

```bash
GET /api/posts?page=1&pageSize=6
GET /api/posts?category=技术&page=1
GET /api/posts?search=React&page=1
```

### 响应数据结构

```typescript
{
  code: number;           // 状态码，200 表示成功
  message: string;        // 响应消息
  data: {
    posts: PostListItem[];  // 文章列表
    pagination: {
      page: number;         // 当前页码
      pageSize: number;     // 每页数量
      total: number;        // 总记录数
      totalPages: number;   // 总页数
    };
  };
}
```

### PostListItem 数据结构

```typescript
{
  id: number;              // 文章ID
  slug: string;            // URL友好的标识符（唯一）
  title: string;           // 文章标题
  excerpt: string;         // 文章摘要
  date: string;            // 发布日期，格式：YYYY-MM-DD
  category: string;        // 分类名称
  imageUrl?: string;       // 封面图片URL（可选）
  readTime?: string;       // 阅读时间，如 "5 min read"（可选）
  tags?: string[];         // 标签数组（可选）
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "posts": [
      {
        "id": 1,
        "slug": "butterfly-5-5-release-notes",
        "title": "Butterfly 5.5 Release Notes",
        "excerpt": "New features include improved lazyload filter...",
        "date": "2025-09-09",
        "category": "Release Notes",
        "imageUrl": "https://example.com/image.jpg",
        "readTime": "5 min read",
        "tags": ["release", "update"]
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 6,
      "total": 16,
      "totalPages": 3
    }
  }
}
```

---

## 2. 获取文章详情

### 接口信息
- **URL**: `/posts/:slug`
- **方法**: `GET`
- **描述**: 根据 slug 获取文章完整内容

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| slug | string | 是 | 文章的唯一标识符 |

### 请求示例

```bash
GET /api/posts/butterfly-5-5-release-notes
```

### 响应数据结构

```typescript
{
  code: number;
  message: string;
  data: BlogPost;
}
```

### BlogPost 数据结构

```typescript
{
  id: number;              // 文章ID
  slug: string;            // URL友好的标识符
  title: string;           // 文章标题
  date: string;            // 发布日期，格式：YYYY-MM-DD
  category: string;        // 分类名称
  readTime: string;        // 阅读时间，如 "5 min read"
  imageUrl: string;        // 封面图片URL
  content: string;         // Markdown 格式的文章内容
  excerpt?: string;        // 文章摘要（可选）
  tags?: string[];         // 标签数组（可选）
  author?: {               // 作者信息（可选）
    name: string;
    avatar?: string;
  };
  views?: number;          // 阅读量（可选）
  likes?: number;          // 点赞数（可选）
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "slug": "butterfly-5-5-release-notes",
    "title": "Butterfly 5.5 Release Notes",
    "date": "2025-09-09",
    "category": "Release Notes",
    "readTime": "5 min read",
    "imageUrl": "https://example.com/image.jpg",
    "content": "# Butterfly 5.5 Release Notes\n\n我们很高兴地宣布...",
    "excerpt": "New features include improved lazyload filter...",
    "tags": ["release", "update"],
    "author": {
      "name": "Sam",
      "avatar": "https://example.com/avatar.jpg"
    },
    "views": 1234,
    "likes": 56
  }
}
```

### 错误响应（文章不存在）

```json
{
  "code": 404,
  "message": "文章未找到",
  "data": null
}
```

---

## 3. 获取侧边栏数据

### 接口信息
- **URL**: `/sidebar`
- **方法**: `GET`
- **描述**: 获取侧边栏所需的所有数据（个人信息、统计、最近文章、标签等）

### 请求示例

```bash
GET /api/sidebar
```

### 响应数据结构

```typescript
{
  code: number;
  message: string;
  data: {
    profile: ProfileInfo;      // 个人信息
    statistics: Statistics;     // 统计数据
    recentPosts: PostListItem[]; // 最近文章（5篇）
    tags: Tag[];                // 标签列表
    categories: Category[];     // 分类列表
    announcement?: string;       // 公告内容（可选）
  };
}
```

### ProfileInfo 数据结构

```typescript
{
  name: string;            // 姓名
  avatar: string;           // 头像URL
  bio: string;             // 个人简介
  socialLinks: {           // 社交媒体链接
    github?: string;
    email?: string;
    twitter?: string;
    [key: string]: string | undefined;
  };
}
```

### Statistics 数据结构

```typescript
{
  articles: number;        // 文章总数
  tags: number;            // 标签总数
  categories: number;      // 分类总数
}
```

### Tag 数据结构

```typescript
{
  id: number;              // 标签ID
  name: string;            // 标签名称
  count?: number;          // 使用该标签的文章数量（可选）
}
```

### Category 数据结构

```typescript
{
  id: number;              // 分类ID
  name: string;            // 分类名称
  count?: number;          // 该分类下的文章数量（可选）
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "profile": {
      "name": "Sam",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "A Simple and Card UI Design theme for Hexo",
      "socialLinks": {
        "github": "https://github.com/yourusername",
        "email": "mailto:your@email.com",
        "twitter": "https://twitter.com/yourusername"
      }
    },
    "statistics": {
      "articles": 25,
      "tags": 12,
      "categories": 6
    },
    "recentPosts": [
      {
        "id": 1,
        "slug": "butterfly-5-5-release-notes",
        "title": "Butterfly 5.5 Release Notes",
        "date": "2025-09-09",
        "category": "Release Notes",
        "imageUrl": "https://example.com/thumb.jpg"
      }
    ],
    "tags": [
      { "id": 1, "name": "Hexo", "count": 5 },
      { "id": 2, "name": "React", "count": 8 },
      { "id": 3, "name": "Next.js", "count": 6 }
    ],
    "categories": [
      { "id": 1, "name": "技术", "count": 15 },
      { "id": 2, "name": "生活", "count": 10 }
    ],
    "announcement": "This is a replica of the Butterfly theme using Material UI and Next.js."
  }
}
```

---

## 4. 获取分类列表

### 接口信息
- **URL**: `/categories`
- **方法**: `GET`
- **描述**: 获取所有分类及其文章数量

### 请求示例

```bash
GET /api/categories
```

### 响应数据结构

```typescript
{
  code: number;
  message: string;
  data: Category[];
}
```

---

## 5. 获取标签列表

### 接口信息
- **URL**: `/tags`
- **方法**: `GET`
- **描述**: 获取所有标签及其使用次数

### 请求示例

```bash
GET /api/tags
```

### 响应数据结构

```typescript
{
  code: number;
  message: string;
  data: Tag[];
}
```

---

## 6. 根据分类获取文章列表

### 接口信息
- **URL**: `/categories/:category/posts`
- **方法**: `GET`
- **描述**: 获取指定分类下的文章列表

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| category | string | 是 | 分类名称 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 6 | 每页数量 |

### 请求示例

```bash
GET /api/categories/技术/posts?page=1&pageSize=6
```

### 响应数据结构

同"获取文章列表"接口

---

## 7. 根据标签获取文章列表

### 接口信息
- **URL**: `/tags/:tag/posts`
- **方法**: `GET`
- **描述**: 获取指定标签下的文章列表

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| tag | string | 是 | 标签名称 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 6 | 每页数量 |

### 请求示例

```bash
GET /api/tags/React/posts?page=1&pageSize=6
```

### 响应数据结构

同"获取文章列表"接口

---

## 8. 搜索文章

### 接口信息
- **URL**: `/posts/search`
- **方法**: `GET`
- **描述**: 根据关键词搜索文章

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| q | string | 是 | - | 搜索关键词 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 6 | 每页数量 |

### 请求示例

```bash
GET /api/posts/search?q=React&page=1&pageSize=6
```

### 响应数据结构

同"获取文章列表"接口

---

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 注意事项

1. **日期格式**: 所有日期字段统一使用 `YYYY-MM-DD` 格式
2. **图片URL**: 建议使用绝对路径，确保分享时能正确显示
3. **内容格式**: 文章内容使用 Markdown 格式
4. **分页**: 页码从 1 开始
5. **slug**: 必须是唯一的，建议使用 URL 友好的格式（小写字母、数字、连字符）
6. **性能**: 建议对列表接口进行缓存，减少数据库查询压力
7. **CORS**: 如果前后端分离部署，需要配置 CORS 允许跨域请求

---

## 接口调用示例（TypeScript）

```typescript
// 获取文章列表
async function getPosts(page: number = 1, pageSize: number = 6) {
  const response = await fetch(
    `${API_BASE_URL}/posts?page=${page}&pageSize=${pageSize}`
  );
  const result = await response.json();
  return result.data;
}

// 获取文章详情
async function getPostBySlug(slug: string) {
  const response = await fetch(`${API_BASE_URL}/posts/${slug}`);
  const result = await response.json();
  if (result.code === 404) {
    return null;
  }
  return result.data;
}

// 获取侧边栏数据
async function getSidebarData() {
  const response = await fetch(`${API_BASE_URL}/sidebar`);
  const result = await response.json();
  return result.data;
}
```

---

## 更新日志

- 2025-01-XX: 初始版本

