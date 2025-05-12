import router from '@adonisjs/core/services/router'

// 用户相关路由
router
  .group(() => {
    // 用户注册
    router.get('/register', async ({ params }) => {
      console.log(params)
      return {
        message: '用户注册成功',
      }
    })
  })
  .prefix('/api/users')
