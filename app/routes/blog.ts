import router from '@adonisjs/core/services/router'
import { apiThrottle } from '#start/limiter'
import { middleware } from '#start/kernel'

const PostsController = () => import('#controllers/blog/posts_controller')
const CategoriesController = () => import('#controllers/blog/categories_controller')
const TagsController = () => import('#controllers/blog/tags_controller')

// 博客相关路由
router
  .group(() => {
    // ========== 文章相关 ==========
    // 获取文章列表
    router.get('/posts', [PostsController, 'index']).use(apiThrottle)

    // 获取文章详情
    router.get('/posts/:slug', [PostsController, 'show']).use(apiThrottle)

    // 搜索文章
    router.get('/posts/search', [PostsController, 'search']).use(apiThrottle)

    // 获取侧边栏数据
    router.get('/sidebar', [PostsController, 'sidebar']).use(apiThrottle)

    // 根据分类获取文章列表
    router.get('/categories/:category/posts', [PostsController, 'getByCategory']).use(apiThrottle)

    // 根据标签获取文章列表
    router.get('/tags/:tag/posts', [PostsController, 'getByTag']).use(apiThrottle)

    // 上传文件 - 需要登录
    router
      .post('/posts/upload', [PostsController, 'upload'])
      .use(middleware.auth())
      .use(apiThrottle)

    // 创建文章 - 需要登录
    router.post('/posts', [PostsController, 'store']).use(middleware.auth()).use(apiThrottle)

    // 更新文章 - 需要登录
    router.put('/posts/:slug', [PostsController, 'update']).use(middleware.auth()).use(apiThrottle)

    // 删除文章 - 需要登录
    router
      .delete('/posts/:id', [PostsController, 'destroy'])
      .use(middleware.auth())
      .use(apiThrottle)

    // ========== 分类 CRUD ==========
    // 获取分类列表
    router.get('/categories', [CategoriesController, 'index']).use(apiThrottle)

    // 创建分类
    router.post('/categories', [CategoriesController, 'store']).use(apiThrottle)

    // 更新分类
    router.put('/categories/:id', [CategoriesController, 'update']).use(apiThrottle)

    // 删除分类
    router.delete('/categories/:id', [CategoriesController, 'destroy']).use(apiThrottle)

    // ========== 标签 CRUD ==========
    // 获取标签列表
    router.get('/tags', [TagsController, 'index']).use(apiThrottle)

    // 创建标签
    router.post('/tags', [TagsController, 'store']).use(apiThrottle)

    // 更新标签
    router.put('/tags/:id', [TagsController, 'update']).use(apiThrottle)

    // 删除标签
    router.delete('/tags/:id', [TagsController, 'destroy']).use(apiThrottle)
  })
  .prefix('/api')
