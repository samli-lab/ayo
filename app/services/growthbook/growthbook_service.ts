import { GrowthBook, Context, WidenPrimitives } from '@growthbook/growthbook'
import growthbookConfig from '#config/growthbook'
import logger from '@adonisjs/core/services/logger'

/**
 * GrowthBook 服务类
 * 用于管理功能标志和 A/B 测试
 */
export class GrowthBookService {
  private static instance: GrowthBook | null = null
  private static isInitialized = false
  private static refreshTimer: NodeJS.Timeout | null = null

  /**
   * 初始化 GrowthBook 实例
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (!growthbookConfig.enabled) {
      logger.info('GrowthBook is disabled')
      return
    }

    if (!growthbookConfig.clientKey) {
      logger.warn('GrowthBook client key is not configured')
      return
    }

    try {
      // 创建 GrowthBook 实例
      this.instance = new GrowthBook({
        apiHost: growthbookConfig.apiHost,
        clientKey: growthbookConfig.clientKey,
        enableDevMode: growthbookConfig.debug,
        trackingCallback: (experiment, result) => {
          if (growthbookConfig.enableTracking) {
            logger.info('GrowthBook experiment tracked', {
              experimentKey: experiment.key,
              variationId: result.variationId,
              value: result.value,
            })
          }
        },
      })

      // 加载功能特性
      await this.instance.loadFeatures()

      // 设置自动刷新
      if (growthbookConfig.refreshInterval > 0) {
        this.startAutoRefresh()
      }

      this.isInitialized = true
      logger.info('GrowthBook initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize GrowthBook', error)
      throw error
    }
  }

  /**
   * 获取 GrowthBook 实例
   */
  static getInstance(): GrowthBook {
    if (!this.instance) {
      throw new Error('GrowthBook is not initialized. Call initialize() first.')
    }
    return this.instance
  }

  /**
   * 为特定用户创建 GrowthBook 实例
   * @param attributes 用户属性（用于实验分组）
   */
  static createInstance(attributes: Context['attributes'] = {}): GrowthBook {
    const gb = new GrowthBook({
      apiHost: growthbookConfig.apiHost,
      clientKey: growthbookConfig.clientKey,
      enableDevMode: growthbookConfig.debug,
      attributes,
      trackingCallback: (experiment, result) => {
        if (growthbookConfig.enableTracking) {
          logger.info('GrowthBook experiment tracked', {
            experimentKey: experiment.key,
            variationId: result.variationId,
            value: result.value,
            userId: attributes.id,
          })
        }
      },
    })

    // 使用共享的特性数据
    if (this.instance) {
      gb.setFeatures(this.instance.getFeatures())
    }

    return gb
  }

  /**
   * 检查功能是否开启
   * @param key 功能 key
   * @param defaultValue 默认值
   */
  static isFeatureEnabled(key: string, defaultValue = false): boolean {
    if (!this.instance || !growthbookConfig.enabled) {
      return defaultValue
    }
    return this.instance.isOn(key)
  }

  /**
   * 获取功能特性值
   * @param key 功能 key
   * @param defaultValue 默认值
   */
  static getFeatureValue<T>(key: string, defaultValue: T): WidenPrimitives<T> {
    if (!this.instance || !growthbookConfig.enabled) {
      return defaultValue as WidenPrimitives<T>
    }
    return this.instance.getFeatureValue(key, defaultValue)
  }

  /**
   * 运行实验
   * @param key 实验 key
   * @param variations 变体数组（至少需要 2 个变体）
   */
  static runExperiment<T>(key: string, variations: [T, T, ...T[]]): T {
    if (!this.instance || !growthbookConfig.enabled) {
      return variations[0]
    }
    const result = this.instance.run({
      key,
      variations,
    })
    return result.value
  }

  /**
   * 手动刷新特性数据
   */
  static async refresh(): Promise<void> {
    if (!this.instance) {
      return
    }

    try {
      await this.instance.refreshFeatures()
      logger.info('GrowthBook features refreshed')
    } catch (error) {
      logger.error('Failed to refresh GrowthBook features', error)
    }
  }

  /**
   * 开始自动刷新
   */
  private static startAutoRefresh(): void {
    if (this.refreshTimer) {
      return
    }

    const intervalMs = growthbookConfig.refreshInterval * 1000
    this.refreshTimer = setInterval(() => {
      this.refresh()
    }, intervalMs)

    logger.info(`GrowthBook auto-refresh started (${growthbookConfig.refreshInterval}s)`)
  }

  /**
   * 停止自动刷新
   */
  static stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
      logger.info('GrowthBook auto-refresh stopped')
    }
  }

  /**
   * 销毁实例
   */
  static async destroy(): Promise<void> {
    this.stopAutoRefresh()
    if (this.instance) {
      this.instance.destroy()
      this.instance = null
    }
    this.isInitialized = false
    logger.info('GrowthBook destroyed')
  }
}
