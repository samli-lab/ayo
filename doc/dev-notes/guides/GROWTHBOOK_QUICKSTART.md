# GrowthBook 快速开始

## 5 分钟快速集成

### 第 1 步：安装依赖

```bash
pnpm install
```

### 第 2 步：配置环境变量

在 `.env` 文件中添加：

```env
GROWTHBOOK_ENABLED=true
GROWTHBOOK_CLIENT_KEY=sdk-your-key-here
```

### 第 3 步：获取 Client Key

1. 访问 https://app.growthbook.io
2. 注册/登录账号
3. 创建新项目
4. 在 SDK Connections 中复制 Client Key
5. 粘贴到 `.env` 文件

### 第 4 步：创建功能标志

在 GrowthBook 控制台中：
1. 点击 "Features" → "Add Feature"
2. Feature Key: `welcome-banner`
3. Value Type: `boolean`
4. Default Value: `true`
5. 点击 "Save"

### 第 5 步：在代码中使用

```typescript
// 在控制器中
export default class MyController {
  async index(ctx: HttpContext) {
    // 检查功能是否开启
    if (ctx.growthbook.isOn('welcome-banner')) {
      return { showBanner: true, message: '欢迎使用新功能！' }
    }
    
    return { showBanner: false }
  }
}
```

### 第 6 步：启用中间件（可选）

如果需要基于用户的功能标志，在路由中启用中间件：

```typescript
// app/routes/your_route.ts
router
  .group(() => {
    // 你的路由
  })
  .use(() => import('#middleware/growthbook_middleware'))
```

### 第 7 步：测试

启动应用并访问测试端点：

```bash
# 启动应用
npm run dev

# 测试 API
curl http://localhost:3333/api/growthbook/feature/check
```

## 完成！🎉

现在你可以：
- ✅ 在 GrowthBook 控制台中创建和管理功能标志
- ✅ 实时控制功能的开启/关闭
- ✅ 进行 A/B 测试
- ✅ 基于用户属性定向功能

## 更多示例

访问示例接口：
- `GET /api/growthbook/feature/check` - 检查功能状态
- `GET /api/growthbook/user/features` - 查看用户功能
- `GET /api/growthbook/user/ab-test` - 运行 A/B 测试

## 详细文档

查看 [完整 GrowthBook 集成指南](./GROWTHBOOK_GUIDE.md) 了解更多高级用法。

