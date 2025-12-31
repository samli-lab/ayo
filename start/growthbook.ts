/**
 * GrowthBook 初始化文件
 * 在应用启动时初始化 GrowthBook 服务
 */
import { GrowthBookService } from '#services/growthbook/growthbook_service'
import logger from '@adonisjs/core/services/logger'

try {
  await GrowthBookService.initialize()
} catch (error) {
  logger.error('Failed to initialize GrowthBook during app startup:', error)
}
