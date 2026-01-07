/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
// 默认路由
import router from '@adonisjs/core/services/router'

// 导入所有路由模块
import '#routes/user'
import '#routes/diagnostics'
import '#routes/blog'
import '#routes/gallery'
import '#routes/growthbook'
import '#routes/distributed_lock'
import '#routes/queue'
import '#routes/test'
import '#routes/ai'
// import '#routes/comment'

router.get('/', async () => {
  return {
    message: 'Welcome to API',
    version: '1.0.0',
  }
})

// returns swagger in YAML
router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

// Renders Swagger-UI and passes YAML-output of /swagger
router.get('/docs', async () => {
  return AutoSwagger.default.ui('/swagger', swagger)
  // return AutoSwagger.default.scalar("/swagger"); to use Scalar instead. If you want, you can pass proxy url as second argument here.
  // return AutoSwagger.default.rapidoc("/swagger", "view"); to use RapiDoc instead (pass "view" default, or "read" to change the render-style)
})
