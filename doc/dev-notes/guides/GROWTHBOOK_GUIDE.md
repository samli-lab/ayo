# GrowthBook 集成指南

## 概述

GrowthBook 是一个开源的功能标志（Feature Flags）和 A/B 测试平台。本项目已完成 GrowthBook 的完整集成。

## 功能特性

- ✅ 功能标志（Feature Flags）
- ✅ A/B 测试
- ✅ 用户分组和定向
- ✅ 实时配置更新
- ✅ 完整的类型支持

## 快速开始

### 1. 环境配置

在 `.env` 文件中添加以下配置：

```env
# GrowthBook 配置
GROWTHBOOK_ENABLED=true
GROWTHBOOK_CLIENT_KEY=your_client_key_here
GROWTHBOOK_API_HOST=https://cdn.growthbook.io
GROWTHBOOK_REFRESH_INTERVAL=60
GROWTHBOOK_ENABLE_TRACKING=true
GROWTHBOOK_ENABLE_STREAMING=false
```

### 2. 获取 Client Key

1. 访问 [GrowthBook Cloud](https://app.growthbook.io) 或自建实例
2. 创建账号并登录
3. 创建新项目
4. 在 SDK Connections 中获取 Client Key
5. 将 Client Key 填入 `.env` 文件

### 3. 安装依赖

```bash
pnpm install
```

项目已经在 `package.json` 中添加了 `@growthbook/growthbook` 依赖。

## 使用方法

### 方式一：全局服务（不依赖用户）

适用于全局功能开关，不需要用户特定属性的场景。

```typescript
import { GrowthBookService } from '#services/growthbook/growthbook_service'

// 检查功能是否开启
const isEnabled = GrowthBookService.isFeatureEnabled('new-feature')

// 获取功能配置值
const buttonColor = GrowthBookService.getFeatureValue('button-color', 'blue')
const maxItems = GrowthBookService.getFeatureValue('max-items-per-page', 10)
```

### 方式二：请求上下文（基于用户）

适用于需要根据用户属性进行个性化的场景，使用 `GrowthBookMiddleware` 自动注入。

```typescript
// 在控制器中
export default class MyController {
  async myMethod(ctx: HttpContext) {
    // ctx.growthbook 已经由中间件自动注入
    const growthbook = ctx.growthbook
    
    // 检查功能
    if (growthbook.isOn('premium-features')) {
      // 显示高级功能
    }
    
    // 获取配置值
    const theme = growthbook.getFeatureValue('theme', 'light')
    
    // 运行 A/B 测试
    const experiment = growthbook.run({
      key: 'homepage-layout',
      variations: ['control', 'variant-a', 'variant-b']
    })
  }
}
```

### 启用中间件

在路由中使用 GrowthBook 中间件：

```typescript
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // 你的路由
  })
  .use(() => import('#middleware/growthbook_middleware'))
```

或者在全局启用，编辑 `start/kernel.ts`：

```typescript
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/i18n_middleware'),
  () => import('#middleware/growthbook_middleware'),
])
```

## API 示例

访问以下端点查看示例：

### 全局功能检查
```bash
GET /api/growthbook/feature/check
GET /api/growthbook/feature/value
```

### 用户特定功能
```bash
GET /api/growthbook/user/features
GET /api/growthbook/user/ab-test
GET /api/growthbook/user/conditional
```

### 管理功能
```bash
POST /api/growthbook/admin/refresh
Authorization: Bearer <token>
```

## 高级用法

### 自定义用户属性

中间件会自动收集以下用户属性：
- `id`: 用户ID（已登录）或 IP 地址
- `email`: 用户邮箱
- `isAuthenticated`: 是否已登录
- `locale`: 语言设置
- `ip`: IP 地址
- `userAgent`: User Agent

你可以在中间件中自定义更多属性：

```typescript
// app/middleware/growthbook_middleware.ts
const attributes = {
  id: ctx.auth.user?.id,
  email: ctx.auth.user?.email,
  
  // 添加自定义属性
  plan: ctx.auth.user?.subscriptionPlan,
  country: ctx.auth.user?.country,
  signupDate: ctx.auth.user?.createdAt,
}
```

### 手动创建实例

```typescript
import { GrowthBookService } from '#services/growthbook/growthbook_service'

const customGB = GrowthBookService.createInstance({
  id: 'user-123',
  email: 'user@example.com',
  plan: 'premium',
  country: 'CN',
})

const isEnabled = customGB.isOn('feature-key')
customGB.destroy() // 记得清理
```

### 手动刷新功能

```typescript
await GrowthBookService.refresh()
```

## 在 GrowthBook 控制台中配置

### 1. 创建功能标志

1. 进入 Features 页面
2. 点击 "Add Feature"
3. 输入 Feature Key（如 `new-dashboard`）
4. 设置默认值
5. 添加规则（可选）

### 2. 创建 A/B 测试

1. 进入 Experiments 页面
2. 点击 "Add Experiment"
3. 设置实验 Key（如 `homepage-layout`）
4. 定义变体（如 `control`, `variant-a`, `variant-b`）
5. 设置流量分配
6. 添加目标规则

### 3. 用户定向

可以基于用户属性定向功能：
- 按用户 ID
- 按邮箱
- 按订阅计划
- 按国家/地区
- 自定义属性

## 常见场景

### 场景 1: 灰度发布

```typescript
// 只对 10% 的用户开启新功能
if (ctx.growthbook.isOn('new-editor')) {
  return renderNewEditor()
} else {
  return renderOldEditor()
}
```

### 场景 2: 白名单用户

在 GrowthBook 控制台中设置规则：
```
if email is in ["user1@example.com", "user2@example.com"]
  then ON
else OFF
```

### 场景 3: A/B 测试

```typescript
const experiment = ctx.growthbook.run({
  key: 'button-color',
  variations: ['red', 'blue', 'green']
})

const buttonColor = experiment.value
```

### 场景 4: 配置管理

```typescript
// 不同用户看到不同的配置
const config = {
  maxUploads: ctx.growthbook.getFeatureValue('max-uploads', 5),
  theme: ctx.growthbook.getFeatureValue('theme', 'light'),
  features: ctx.growthbook.getFeatureValue('enabled-features', []),
}
```

## 性能优化

1. **自动刷新**: 配置 `GROWTHBOOK_REFRESH_INTERVAL` 控制更新频率
2. **流式更新**: 启用 `GROWTHBOOK_ENABLE_STREAMING` 使用 SSE 实时更新
3. **共享实例**: 多个请求共享同一份特性数据，减少内存占用

## 监控和调试

### 启用调试日志

```env
GROWTHBOOK_ENABLED=true
NODE_ENV=development
```

### 查看实验追踪

开启 tracking 后，实验曝光会自动记录到日志：

```json
{
  "level": "info",
  "message": "GrowthBook experiment tracked",
  "experimentKey": "homepage-layout",
  "variationId": 1,
  "value": "variant-a",
  "userId": "user-123"
}
```

## 故障排除

### 问题 1: 功能不生效

- 检查 `GROWTHBOOK_ENABLED` 是否为 `true`
- 检查 `GROWTHBOOK_CLIENT_KEY` 是否正确
- 查看应用启动日志，确认初始化成功

### 问题 2: 中间件报错

- 确保在路由中正确使用中间件
- 检查用户属性是否正确

### 问题 3: 配置不更新

- 手动调用刷新接口
- 检查 `GROWTHBOOK_REFRESH_INTERVAL` 配置
- 查看网络连接是否正常

## 相关资源

- [GrowthBook 官方文档](https://docs.growthbook.io/)
- [GrowthBook SDK 文档](https://docs.growthbook.io/lib/js)
- [GrowthBook Cloud](https://app.growthbook.io)

## 文件结构

```
app/
├── controllers/
│   └── growthbook_example_controller.ts  # 示例控制器
├── middleware/
│   └── growthbook_middleware.ts           # GrowthBook 中间件
├── routes/
│   └── growthbook.ts                      # 示例路由
└── services/
    └── growthbook/
        └── growthbook_service.ts          # GrowthBook 服务

config/
└── growthbook.ts                          # GrowthBook 配置

start/
└── growthbook.ts                          # GrowthBook 初始化
```

## 下一步

1. 在 GrowthBook 控制台创建你的第一个功能标志
2. 在代码中使用 `ctx.growthbook.isOn('your-feature')` 检查功能
3. 查看示例控制器了解更多用法
4. 阅读 GrowthBook 官方文档了解高级特性

