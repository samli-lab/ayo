import env from '#start/env'

/**
 * GrowthBook 配置
 */
export default {
  /**
   * GrowthBook API 地址
   * 默认使用官方云服务，也可以自建服务
   */
  apiHost: env.get('GROWTHBOOK_API_HOST', 'https://cdn.growthbook.io'),

  /**
   * GrowthBook Client Key
   * 从 GrowthBook 控制台获取
   */
  clientKey: env.get('GROWTHBOOK_CLIENT_KEY', ''),

  /**
   * 是否启用 GrowthBook
   */
  enabled: env.get('GROWTHBOOK_ENABLED', false),

  /**
   * 功能特性更新间隔（秒）
   * 定期从服务器拉取最新的特性配置
   */
  refreshInterval: env.get('GROWTHBOOK_REFRESH_INTERVAL', 60),

  /**
   * 是否启用开发模式
   * 开发模式下会输出更多日志信息
   */
  debug: env.get('NODE_ENV') === 'development',

  /**
   * 是否启用跟踪
   * 用于记录实验曝光和结果
   */
  enableTracking: env.get('GROWTHBOOK_ENABLE_TRACKING', true),

  /**
   * 是否启用流式更新
   * 使用 SSE 实时接收特性更新
   */
  enableStreaming: env.get('GROWTHBOOK_ENABLE_STREAMING', false),
}
