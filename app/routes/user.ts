import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { testValidator } from '#validators/user_validator'
import UserController from '#controllers/user/user_controller'

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
    router
      .get('/test', '#controllers/user/user_controller.index')
      .use(middleware.validate([testValidator]))
    router.post('/test', userController.index).use(middleware.validate([testValidator]))
  })
  .prefix('/api/users')
