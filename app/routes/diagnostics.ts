import router from '@adonisjs/core/services/router'

// 诊断相关路由
// 目前暂时为空，后续可以添加性能分析、健康检查等路由
router
  .group(() => {
    // 可以在这里添加诊断相关的路由
    // 例如：性能分析、健康检查等
  })
  .prefix('/api/diagnostics')
