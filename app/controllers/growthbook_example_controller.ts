import type { HttpContext } from '@adonisjs/core/http'
import { GrowthBookService } from '#services/growthbook/growthbook_service'

/**
 * GrowthBook 示例控制器
 * 展示如何使用 GrowthBook 进行功能标志和 A/B 测试
 */
export default class GrowthBookExampleController {
  /**
   * @featureCheck
   * @summary 检查功能是否开启
   * @description 演示如何检查某个功能是否对当前用户开启
   * @responseBody 200 - {"feature": "new-dashboard", "enabled": true, "message": "Feature status"}
   */
  async checkFeature(ctx: HttpContext) {
    // 使用全局实例检查功能
    const featureKey = 'new-dashboard'
    const isEnabled = GrowthBookService.isFeatureEnabled(featureKey)

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
    // 获取功能配置值
    const buttonColor = GrowthBookService.getFeatureValue('button-color', 'blue')
    const maxItems = GrowthBookService.getFeatureValue('max-items-per-page', 10)

    return ctx.response.json({
      features: {
        buttonColor,
        maxItems,
      },
      message: '功能配置获取成功',
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
   * @summary 手动刷新功能
   * @description 手动刷新 GrowthBook 的功能配置
   * @responseBody 200 - {"success": true, "message": "Features refreshed"}
   */
  async refreshFeatures(ctx: HttpContext) {
    try {
      await GrowthBookService.refresh()
      return ctx.response.json({
        success: true,
        message: '功能配置已刷新',
      })
    } catch (error) {
      return ctx.response.status(500).json({
        success: false,
        message: '刷新功能配置失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}

