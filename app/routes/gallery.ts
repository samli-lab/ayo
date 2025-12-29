import router from '@adonisjs/core/services/router'
import { apiThrottle } from '#start/limiter'
import { middleware } from '#start/kernel'

const GalleryController = () => import('#controllers/blog/gallery_controller')

router
  .group(() => {
    // 获取列表
    router.get('/gallery', [GalleryController, 'index']).use(apiThrottle)

    // 获取单张照片
    router.get('/gallery/:id', [GalleryController, 'show']).use(apiThrottle)

    // 添加照片
    router.post('/gallery', [GalleryController, 'store']).use(middleware.auth()).use(apiThrottle)

    // 更新照片
    router
      .put('/gallery/:id', [GalleryController, 'update'])
      .use(middleware.auth())
      .use(apiThrottle)

    // 删除照片
    router
      .delete('/gallery/:id', [GalleryController, 'destroy'])
      .use(middleware.auth())
      .use(apiThrottle)
  })
  .prefix('/api')
