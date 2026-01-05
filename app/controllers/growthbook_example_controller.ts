import type { HttpContext } from '@adonisjs/core/http'

/**
 * GrowthBook 示例控制器
 * 展示如何使用 GrowthBook 进行功能标志和 A/B 测试
 *
 * 说明：所有方法都使用 ctx.growthbook，实现：
 * - 请求级别刷新：每个新的 HTTP 请求都会创建新的 GrowthBook 实例并加载最新特征
 * - 请求内缓存：同一请求中复用实例，保证一致性
 */
export default class GrowthBookExampleController {
  /**
   * @featureCheck
   * @summary 检查功能是否开启
   * @description 演示如何检查某个功能是否对当前用户开启
   * @responseBody 200 - {"feature": "new-dashboard", "enabled": true, "message": "Feature status"}
   */
  async checkFeature(ctx: HttpContext) {
    // 使用请求上下文中的 GrowthBook 实例
    const featureKey = 'new-dashboard'
    const isEnabled = ctx.growthbook.isOn(featureKey)

    return ctx.response.json({
      feature: featureKey,
      enabled: isEnabled,
      message: isEnabled ? '新功能已开启' : '新功能未开启',
    })
  }

  /**
   * @featureValue
   * @summary 获取功能特性值
   * @description 演示如何获取功能的配置值（如主题颜色、文案等）
   * @responseBody 200 - {"feature": "button-color", "value": "blue", "message": "Feature value"}
   */
  async getFeatureValue(ctx: HttpContext) {
    // 使用请求上下文中的 GrowthBook 实例（基于当前用户）
    // ctx.growthbook 由 GrowthBookMiddleware 创建，包含用户特定属性
    const buttonColor = ctx.growthbook.getFeatureValue('button-color', 'b')
    const maxItems = ctx.growthbook.getFeatureValue('max-items-per-page', 10)
    const userAttributes = ctx.growthbook.getAttributes()
    const allFeatures = ctx.growthbook.getPayload()

    return ctx.response.json({
      // 用户特定功能值（可能根据用户属性不同）
      features: {
        buttonColor,
        maxItems,
        attributes: userAttributes, // 显示用户属性
      },
      debug: {
        hasPayload: !!allFeatures,
        featureCount: allFeatures?.features ? Object.keys(allFeatures.features).length : 0,
        availableFeatures: allFeatures?.features ? Object.keys(allFeatures.features) : [],
        fullPayload: allFeatures,
      },
      message: '功能配置获取成功（请求级别实例，每次请求都会刷新）',
    })
  }

  /**
   * @userFeature
   * @summary 基于用户的功能检查
   * @description 演示如何为特定用户检查功能（使用中间件注入的 ctx.growthbook）
   * @responseBody 200 - {"userId": "123", "features": {}, "message": "User-specific features"}
   */
  async checkUserFeature(ctx: HttpContext) {
    // 使用请求上下文中的 GrowthBook 实例
    // 这个实例已经包含了当前用户的属性
    const growthbook = ctx.growthbook

    const features = {
      // 检查功能是否开启
      newDashboard: growthbook.isOn('new-dashboard'),
      betaFeatures: growthbook.isOn('beta-features'),

      // 获取功能值
      theme: growthbook.getFeatureValue('theme', 'light'),
      language: growthbook.getFeatureValue('default-language', 'zh-CN'),
    }

    return ctx.response.json({
      userId: ctx.auth.user?.id || 'anonymous',
      features,
      message: '用户特定功能获取成功',
    })
  }

  /**
   * @abTest
   * @summary A/B 测试示例
   * @description 演示如何运行 A/B 测试并返回不同的变体
   * @responseBody 200 - {"experiment": "homepage-layout", "variant": "control", "content": {}}
   */
  async runABTest(ctx: HttpContext) {
    const growthbook = ctx.growthbook

    // 运行实验并获取变体
    const experiment = growthbook.run({
      key: 'homepage-layout',
      variations: ['control', 'variant-a', 'variant-b'],
    })

    // 根据实验结果返回不同的内容
    let content = {}
    switch (experiment.value) {
      case 'variant-a':
        content = {
          layout: 'grid',
          columns: 3,
          showFeatured: true,
        }
        break
      case 'variant-b':
        content = {
          layout: 'list',
          density: 'compact',
          showSidebar: true,
        }
        break
      default:
        content = {
          layout: 'default',
          columns: 2,
        }
    }

    return ctx.response.json({
      experiment: 'homepage-layout',
      variant: experiment.value,
      inExperiment: experiment.inExperiment,
      content,
      message: 'A/B 测试执行成功',
    })
  }

  /**
   * @conditionalFeature
   * @summary 条件性功能展示
   * @description 演示如何根据用户属性展示不同的功能
   * @responseBody 200 - {"userId": "123", "canAccessPremium": false, "features": []}
   */
  async conditionalFeature(ctx: HttpContext) {
    const growthbook = ctx.growthbook

    // 检查用户是否可以访问高级功能
    const canAccessPremium = growthbook.isOn('premium-features')
    const canAccessBeta = growthbook.isOn('beta-access')

    // 构建可用功能列表
    const availableFeatures = []

    if (canAccessPremium) {
      availableFeatures.push('advanced-analytics', 'priority-support', 'custom-themes')
    }

    if (canAccessBeta) {
      availableFeatures.push('ai-assistant', 'new-editor', 'collaboration-tools')
    }

    // 基础功能始终可用
    availableFeatures.push('basic-dashboard', 'profile-management')

    return ctx.response.json({
      userId: ctx.auth.user?.id || 'anonymous',
      canAccessPremium,
      canAccessBeta,
      features: availableFeatures,
      message: '功能权限检查完成',
    })
  }

  /**
   * @refreshFeatures
   * @summary 功能刷新说明
   * @description 说明 GrowthBook 的自动刷新机制
   * @responseBody 200 - {"autoRefresh": true, "message": "Features are auto-refreshed"}
   */
  async refreshFeatures(ctx: HttpContext) {
    // 使用请求级别的 GrowthBook 实例，无需手动刷新
    // 每个新请求都会自动创建新实例并加载最新特征
    const allFeatures = ctx.growthbook.getPayload()

    return ctx.response.json({
      autoRefresh: true,
      message: '每个请求都会自动创建新的 GrowthBook 实例并加载最新特征，无需手动刷新',
      info: {
        explanation: '请求级别刷新：每个新的 HTTP 请求都会创建新的 GrowthBook 实例并加载最新特征',
        consistency: '请求内缓存：同一请求中复用实例，保证一致性',
      },
      currentRequest: {
        featureCount: allFeatures?.features ? Object.keys(allFeatures.features).length : 0,
        availableFeatures: allFeatures?.features ? Object.keys(allFeatures.features) : [],
      },
    })
  }
}
