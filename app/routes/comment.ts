import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// 评论相关路由
router
  .group(() => {
    // 创建评论
    router.post('/', 'CommentsController.store').use(middleware.auth())

    // 获取评论列表
    router.get('/', 'CommentsController.index')

    // 获取单个评论
    router.get('/:id', 'CommentsController.show')

    // 更新评论
    router.put('/:id', 'CommentsController.update').use(middleware.auth())

    // 删除评论
    router.delete('/:id', 'CommentsController.destroy').use(middleware.auth())
  })
  .prefix('/api/comments')
