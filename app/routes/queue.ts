import router from '@adonisjs/core/services/router'

const QueueExampleController = () => import('#controllers/queue_example_controller')

// 队列示例路由
router
  .group(() => {
    // 基础操作
    router.post('/push', [QueueExampleController, 'pushMessage'])
    router.get('/pop', [QueueExampleController, 'popMessage'])

    // 实际应用示例
    router.post('/email', [QueueExampleController, 'queueEmail'])
    router.post('/delayed', [QueueExampleController, 'pushDelayedMessage'])
    router.post('/process-delayed', [QueueExampleController, 'processDelayed'])

    // 管理功能
    router.get('/stats', [QueueExampleController, 'getStats'])
    router.get('/peek', [QueueExampleController, 'peekQueue'])
    router.get('/dlq', [QueueExampleController, 'getDeadLetterQueue'])
    router.post('/batch-process', [QueueExampleController, 'batchProcess'])
    router.delete('/clear', [QueueExampleController, 'clearQueue'])
  })
  .prefix('/api/queue')

