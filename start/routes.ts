/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

// 导入所有路由模块
import '#routes/user'
import '#routes/comment'

// 默认路由
import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    message: 'Welcome to API',
    version: '1.0.0',
  }
})
