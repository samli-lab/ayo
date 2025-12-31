import router from '@adonisjs/core/services/router'

const DistributedLockExampleController = () =>
  import('#controllers/distributed_lock_example_controller')

// 分布式锁示例路由
router
  .group(() => {
    // 基础示例
    router.get('/basic', [DistributedLockExampleController, 'basicLock'])

    // 订单处理示例
    router.post('/order/:orderId', [DistributedLockExampleController, 'processOrder'])

    // 非阻塞锁示例
    router.post('/cleanup', [DistributedLockExampleController, 'tryCleanup'])

    // 用户操作锁示例
    router.post('/user/:userId/operation', [DistributedLockExampleController, 'userOperation'])

    // 检查锁状态
    router.get('/check', [DistributedLockExampleController, 'checkLock'])

    // 强制释放锁（管理员功能，建议加认证）
    router.delete('/force-release', [DistributedLockExampleController, 'forceRelease'])
    // .use(middleware.auth()) // 取消注释以启用认证

    // 并发测试
    router.get('/concurrent-test', [DistributedLockExampleController, 'concurrentTest'])
  })
  .prefix('/api/distributed-lock')
