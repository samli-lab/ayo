import router from '@adonisjs/core/services/router'
import { apiThrottle } from '#start/limiter'

const BlogController = () => import('#controllers/blog/blog_controller')

// 博客相关路由
router
  .group(() => {
    // 获取文章列表
    router.get('/posts', [BlogController, 'getPosts']).use(apiThrottle)

    // 获取文章详情
    router.get('/posts/:slug', [BlogController, 'getPostBySlug']).use(apiThrottle)

    // 搜索文章
    router.get('/posts/search', [BlogController, 'searchPosts']).use(apiThrottle)

    // 获取侧边栏数据
    router.get('/sidebar', [BlogController, 'getSidebar']).use(apiThrottle)

    // 获取分类列表
    router.get('/categories', [BlogController, 'getCategories']).use(apiThrottle)

    // 获取标签列表
    router.get('/tags', [BlogController, 'getTags']).use(apiThrottle)

    // 根据分类获取文章列表
    router
      .get('/categories/:category/posts', [BlogController, 'getPostsByCategory'])
      .use(apiThrottle)

    // 根据标签获取文章列表
    router.get('/tags/:tag/posts', [BlogController, 'getPostsByTag']).use(apiThrottle)
  })
  .prefix('/api')

