import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const GrowthBookExampleController = () =>
  import('#controllers/growthbook_example_controller')

// GrowthBook 示例路由
// 这些路由使用 GrowthBook 中间件来为每个请求创建用户特定的实例
router
  .group(() => {
    // 全局功能检查（不依赖用户）
    router.get('/feature/check', [GrowthBookExampleController, 'checkFeature'])
    router.get('/feature/value', [GrowthBookExampleController, 'getFeatureValue'])

    // 用户特定功能（使用中间件注入的 ctx.growthbook）
    router.get('/user/features', [GrowthBookExampleController, 'checkUserFeature'])
    router.get('/user/ab-test', [GrowthBookExampleController, 'runABTest'])
    router.get('/user/conditional', [GrowthBookExampleController, 'conditionalFeature'])

    // 管理功能
    router.post('/admin/refresh', [GrowthBookExampleController, 'refreshFeatures']).use(
      middleware.auth()
    )
  })
  .prefix('/api/growthbook')
  // 为所有路由应用 GrowthBook 中间件
  .use(async ({ }, next) => {
    // 这里可以添加 GrowthBook 中间件
    // .use(() => import('#middleware/growthbook_middleware'))
    await next()
  })

