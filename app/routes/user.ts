import router from '@adonisjs/core/services/router'
import UserController from '#controllers/user/user_controller'
import { apiThrottle } from '#start/limiter'

const userController = new UserController()
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
    router.get('/test', userController.index)
    router.post('/test/:id', userController.index).use(apiThrottle)
  })
  .prefix('/api/users')
