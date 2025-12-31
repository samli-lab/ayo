import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { apiThrottle, loginThrottle } from '#start/limiter'

const UserController = () => import('#controllers/user/user_controller')
const TranslationController = () => import('#controllers/translation/translation_controller')

// 用户相关路由
router
  .group(() => {
    // 用户登录 - 1分钟只能请求1次
    router.post('/login', [UserController, 'login']).use(loginThrottle)

    // 用户退出登录 - 需要认证
    router.post('/logout', [UserController, 'logout']).use(middleware.auth())

    // 用户注册
    router.get('/register', async ({ params }) => {
      console.log(params)
      return {
        message: '用户注册成功',
      }
    })
    router.get('/test', [UserController, 'test'])
    router.post('/test/:id', [UserController, 'index']).use(apiThrottle)
    router.post('/translation', [TranslationController, 'translate'])
  })
  .prefix('/api/users')
