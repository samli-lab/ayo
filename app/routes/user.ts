import router from '@adonisjs/core/services/router'
import { apiThrottle } from '#start/limiter'

const UserController = () => import('#controllers/user/user_controller')
const TranslationController = () => import('#controllers/translation/translation_controller')

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
    router.get('/test', [UserController, 'test'])
    router.post('/test/:id', [UserController, 'index']).use(apiThrottle)
    router.post('/translation', [TranslationController, 'translate'])
  })
  .prefix('/api/users')
