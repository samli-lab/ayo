/**
 * GrowthBook 类型定义
 */

/**
 * 功能标志配置
 */
export interface FeatureConfig {
  /**
   * 功能 key
   */
  key: string

  /**
   * 默认值
   */
  defaultValue: any

  /**
   * 描述
   */
  description?: string
}

/**
 * 实验配置
 */
export interface ExperimentConfig {
  /**
   * 实验 key
   */
  key: string

  /**
   * 变体列表
   */
  variations: any[]

  /**
   * 流量分配权重
   */
  weights?: number[]
}

/**
 * 用户属性
 */
export interface UserAttributes {
  /**
   * 用户 ID
   */
  id?: string

  /**
   * 邮箱
   */
  email?: string

  /**
   * 全名
   */
  fullName?: string

  /**
   * 是否已登录
   */
  isAuthenticated?: boolean

  /**
   * 语言设置
   */
  locale?: string

  /**
   * IP 地址
   */
  ip?: string

  /**
   * User Agent
   */
  userAgent?: string

  /**
   * 请求 URL
   */
  url?: string

  /**
   * 自定义属性
   */
  [key: string]: any
}

/**
 * GrowthBook 配置选项
 */
export interface GrowthBookConfig {
  /**
   * API 地址
   */
  apiHost: string

  /**
   * Client Key
   */
  clientKey: string

  /**
   * 是否启用
   */
  enabled: boolean

  /**
   * 刷新间隔（秒）
   */
  refreshInterval: number

  /**
   * 是否启用调试
   */
  debug: boolean

  /**
   * 是否启用追踪
   */
  enableTracking: boolean

  /**
   * 是否启用流式更新
   */
  enableStreaming: boolean
}
