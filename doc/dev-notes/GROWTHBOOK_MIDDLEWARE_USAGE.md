# GrowthBook Middleware 使用指南

## 📚 概述

GrowthBook 提供了两种使用方式：
1. **全局实例** - 所有用户共享同一配置
2. **请求级实例** - 基于用户属性的个性化配置

## 🔧 配置步骤

### 1. 注册中间件

在 `start/kernel.ts` 中注册：

```typescript
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
  growthbook: () => import('#middleware/growthbook_middleware'), // ✅ 已添加
})
```

### 2. 在路由中使用

```typescript
// app/routes/growthbook.ts
router
  .group(() => {
    router.get('/feature/value', [GrowthBookExampleController, 'getFeatureValue'])
    // ... 其他路由
  })
  .prefix('/api/growthbook')
  .use(middleware.growthbook()) // ✅ 启用中间件
```

## 📖 使用方式对比

### 方式 1：全局实例（不区分用户）

```typescript
async getFeatureValue(ctx: HttpContext) {
  // 使用全局单例
  const buttonColor = GrowthBookService.getFeatureValue('button-color', 'blue')
  
  // 所有用户得到相同的值
  return ctx.response.json({ buttonColor })
}
```

**适用场景：**
- ✅ 全局功能开关（如"维护模式"）
- ✅ 不需要个性化的配置
- ✅ 简单的 on/off 功能

### 方式 2：请求级实例（基于用户属性）

```typescript
async getFeatureValue(ctx: HttpContext) {
  // 使用中间件注入的实例
  const buttonColor = ctx.growthbook.getFeatureValue('button-color', 'blue')
  
  // 不同用户可能得到不同的值（基于 A/B 测试）
  return ctx.response.json({ 
    buttonColor,
    userAttributes: ctx.growthbook.getAttributes() 
  })
}
```

**适用场景：**
- ✅ A/B 测试（不同用户看到不同变体）
- ✅ 基于用户属性的功能（如 VIP 用户专属功能）
- ✅ 灰度发布（按用户 ID 百分比）
- ✅ 地区特定功能

## 🎯 实际示例

### 示例 1：简单功能开关

```typescript
async checkFeature(ctx: HttpContext) {
  // 使用全局实例即可
  const isNewDashboardEnabled = GrowthBookService.isFeatureEnabled('new-dashboard')
  
  if (isNewDashboardEnabled) {
    return ctx.response.json({ message: '新仪表板已启用' })
  } else {
    return ctx.response.json({ message: '使用旧仪表板' })
  }
}
```

### 示例 2：A/B 测试

```typescript
async runABTest(ctx: HttpContext) {
  // 使用请求级实例，确保用户分组一致
  const experiment = ctx.growthbook.run({
    key: 'homepage-layout',
    variations: ['control', 'variant-a', 'variant-b'],
  })
  
  // 同一用户总是看到相同的变体
  return ctx.response.json({
    variant: experiment.value,
    userId: ctx.growthbook.getAttributes().id,
  })
}
```

### 示例 3：基于用户角色的功能

```typescript
async checkPremiumFeature(ctx: HttpContext) {
  // 中间件自动收集用户属性
  // 可以在 GrowthBook 控制台设置规则：
  // if user.isPremium === true, enable feature
  
  const canAccessPremium = ctx.growthbook.isOn('premium-features')
  
  return ctx.response.json({
    canAccess: canAccessPremium,
    userEmail: ctx.auth.user?.email,
  })
}
```

## 🔍 中间件工作原理

### 生命周期

```
1. HTTP 请求到达
        ↓
2. GrowthBookMiddleware.handle() 执行
        ↓
3. 收集用户属性（id, ip, userAgent, locale 等）
        ↓
4. 创建请求级 GrowthBook 实例
   ctx.growthbook = GrowthBookService.createInstance(attributes)
        ↓
5. 复用全局缓存的 payload（不重新请求网络）
        ↓
6. 执行控制器方法
   controller.method(ctx)  // ✅ 可以使用 ctx.growthbook
        ↓
7. 请求结束
        ↓
8. 销毁请求级实例
   ctx.growthbook.destroy()
        ↓
9. 响应返回给客户端
```

### 收集的用户属性

中间件自动收集以下属性：

```typescript
{
  id: ctx.auth.user?.id || ctx.request.ip(),  // 用户 ID 或 IP
  ip: ctx.request.ip(),                        // IP 地址
  userAgent: ctx.request.header('user-agent'), // 浏览器信息
  url: ctx.request.url(),                      // 请求路径
  locale: ctx.i18n?.locale,                    // 语言
  isAuthenticated: !!ctx.auth.user,            // 是否登录
  email: ctx.auth.user?.email,                 // 邮箱（如已登录）
  fullName: ctx.auth.user?.fullName,           // 姓名（如已登录）
}
```

这些属性可以在 GrowthBook 控制台中用于定向规则。

## ⚖️ 对比总结

| 特性 | 全局实例 | 请求级实例（中间件） |
|------|---------|-------------------|
| **访问方式** | `GrowthBookService.getInstance()` | `ctx.growthbook` |
| **用户属性** | 无 | 自动收集 |
| **A/B 测试** | ❌ 不支持 | ✅ 支持 |
| **个性化** | ❌ 所有用户相同 | ✅ 可以不同 |
| **性能** | 极快（直接读取） | 快（复用缓存） |
| **内存占用** | ~1.5MB（固定） | ~50KB（每次请求） |
| **适用场景** | 全局开关 | A/B 测试、个性化 |

## 🎯 推荐实践

1. **全局功能开关** → 使用全局实例
   ```typescript
   const isMaintenanceMode = GrowthBookService.isFeatureEnabled('maintenance-mode')
   ```

2. **A/B 测试** → 使用 ctx.growthbook
   ```typescript
   const variant = ctx.growthbook.run({ key: 'test', variations: ['a', 'b'] })
   ```

3. **需要用户上下文** → 使用 ctx.growthbook
   ```typescript
   const canAccess = ctx.growthbook.isOn('vip-feature')
   ```

4. **简单配置值** → 看情况
   ```typescript
   // 全局配置
   const globalTheme = GrowthBookService.getFeatureValue('theme', 'light')
   
   // 用户特定配置
   const userTheme = ctx.growthbook.getFeatureValue('theme', 'light')
   ```

## 🚀 测试

### 测试请求

```bash
# 测试全局和用户特定功能
curl http://localhost:3333/api/growthbook/feature/value

# 不同用户可能看到不同的结果
curl http://localhost:3333/api/growthbook/user/ab-test \
  -H "Authorization: Bearer USER_1_TOKEN"

curl http://localhost:3333/api/growthbook/user/ab-test \
  -H "Authorization: Bearer USER_2_TOKEN"
```

### 预期响应

```json
{
  "globalFeatures": {
    "buttonColor": "blue",
    "maxItems": 20
  },
  "userFeatures": {
    "buttonColor": "red",  // 可能因用户而异
    "maxItems": 20,
    "attributes": {
      "id": "user-123",
      "ip": "127.0.0.1",
      "isAuthenticated": true,
      "email": "user@example.com"
    }
  }
}
```

## 📝 注意事项

1. **中间件顺序**：确保 `auth` 中间件在 `growthbook` 之前执行（已在 router.use 中配置）
2. **性能影响**：每次请求创建实例很轻量（~50KB），因为复用了全局缓存
3. **内存管理**：中间件自动在请求结束时调用 `destroy()`，无需手动清理
4. **错误处理**：即使 GrowthBook 出错，也不会影响正常请求

## 🔗 相关文档

- [GrowthBook 完整指南](./guides/GROWTHBOOK_GUIDE.md)
- [GrowthBook 快速开始](./guides/GROWTHBOOK_QUICKSTART.md)

