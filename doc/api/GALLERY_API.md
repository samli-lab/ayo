# Gallery API 文档

相册照片管理接口，提供照片的增删改查功能。

## 基础路径

所有接口的基础路径：`/api/gallery`

---

## 接口列表

### 1. 获取相册照片列表

**接口信息**
- **Method**: `GET`
- **Path**: `/api/gallery`
- **Summary**: 获取相册照片列表
- **Description**: 获取相册所有照片列表，支持分页和搜索

**查询参数**

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| page | number | 否 | 页码 | 1 |
| pageSize | number | 否 | 每页数量 | 12 |
| search | string | 否 | 搜索关键词（搜索标题和描述） | - |

**请求示例**

```bash
GET /api/gallery?page=1&pageSize=12&search=远方
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "photos": [
      {
        "id": "uuid-string",
        "title": "远方",
        "description": "在山海之间寻找片刻宁静",
        "url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 12,
      "total": 9,
      "totalPages": 1
    }
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码 |
| message | string | 消息 |
| data.photos | array | 照片列表 |
| data.photos[].id | string | 照片 ID |
| data.photos[].title | string | 照片标题 |
| data.photos[].description | string \| null | 照片描述 |
| data.photos[].url | string | 照片 URL |
| data.pagination | object | 分页信息 |
| data.pagination.page | number | 当前页码 |
| data.pagination.pageSize | number | 每页数量 |
| data.pagination.total | number | 总记录数 |
| data.pagination.totalPages | number | 总页数 |

---

### 2. 获取单张照片详情

**接口信息**
- **Method**: `GET`
- **Path**: `/api/gallery/:id`
- **Summary**: 获取单张照片详情
- **Description**: 根据 ID 获取照片详细信息

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 照片 ID (UUID) |

**请求示例**

```bash
GET /api/gallery/123e4567-e89b-12d3-a456-426614174000
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "远方",
    "description": "在山海之间寻找片刻宁静",
    "url": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    "sortOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

**错误响应**

```json
{
  "code": 404,
  "message": "照片未找到",
  "data": null
}
```

---

### 3. 添加照片

**接口信息**
- **Method**: `POST`
- **Path**: `/api/gallery`
- **Summary**: 添加照片
- **Description**: 向相册添加新照片

**请求体**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 照片标题 |
| url | string | 是 | 照片 URL（必须是有效的 URL） |
| description | string | 否 | 照片描述 |
| sortOrder | number | 否 | 排序号 | 0 |

**请求示例**

```bash
POST /api/gallery
Content-Type: application/json

{
  "title": "新照片",
  "url": "https://example.com/photo.jpg",
  "description": "这是一张新照片",
  "sortOrder": 10
}
```

**响应示例**

```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "新照片",
    "description": "这是一张新照片",
    "url": "https://example.com/photo.jpg",
    "sortOrder": 10,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "deletedAt": null
  }
}
```

---

### 4. 更新照片信息

**接口信息**
- **Method**: `PUT`
- **Path**: `/api/gallery/:id`
- **Summary**: 更新照片信息
- **Description**: 更新指定 ID 的照片信息

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 照片 ID (UUID) |

**请求体**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 否 | 照片标题 |
| url | string | 否 | 照片 URL（必须是有效的 URL） |
| description | string | 否 | 照片描述 |
| sortOrder | number | 否 | 排序号 |

**请求示例**

```bash
PUT /api/gallery/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "title": "更新后的标题",
  "description": "更新后的描述"
}
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "更新后的标题",
    "description": "更新后的描述",
    "url": "https://example.com/photo.jpg",
    "sortOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z",
    "deletedAt": null
  }
}
```

**错误响应**

```json
{
  "code": 404,
  "message": "照片未找到",
  "data": null
}
```

---

### 5. 删除照片

**接口信息**
- **Method**: `DELETE`
- **Path**: `/api/gallery/:id`
- **Summary**: 删除照片
- **Description**: 软删除指定 ID 的照片（设置 deleted_at 字段，不会真正删除数据）

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 照片 ID (UUID) |

**请求示例**

```bash
DELETE /api/gallery/123e4567-e89b-12d3-a456-426614174000
```

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

**错误响应**

```json
{
  "code": 404,
  "message": "照片未找到",
  "data": null
}
```

---

## 注意事项

1. **软删除**: 删除操作是软删除，数据不会真正从数据库中移除，只是设置了 `deleted_at` 字段。已删除的照片不会出现在列表中。

2. **排序**: 照片列表按 `sortOrder` 正序排列，相同排序号时按创建时间倒序排列。

3. **搜索**: 搜索功能会在照片的标题和描述中进行模糊匹配（不区分大小写）。

4. **分页**: 默认每页返回 12 条记录，可以通过 `pageSize` 参数调整，最大不超过 100。

5. **URL 验证**: 添加和更新照片时，`url` 字段必须是有效的 URL 格式。

6. **ID 格式**: 所有照片 ID 使用 UUID 格式。

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误或验证失败 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

