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

    // ========== 文章 CRUD ==========
    // 上传文件
    router.post('/posts/upload', [BlogController, 'upload']).use(apiThrottle)

    // 创建文章
    router.post('/posts', [BlogController, 'createPost']).use(apiThrottle)

    // 更新文章
    router.put('/posts/:slug', [BlogController, 'updatePost']).use(apiThrottle)

    // 删除文章
    router.delete('/posts/:id', [BlogController, 'deletePost']).use(apiThrottle)

    // ========== 分类 CRUD ==========
    // 创建分类
    router.post('/categories', [BlogController, 'createCategory']).use(apiThrottle)

    // 更新分类
    router.put('/categories/:id', [BlogController, 'updateCategory']).use(apiThrottle)

    // 删除分类
    router.delete('/categories/:id', [BlogController, 'deleteCategory']).use(apiThrottle)

    // ========== 标签 CRUD ==========
    // 创建标签
    router.post('/tags', [BlogController, 'createTag']).use(apiThrottle)

    // 更新标签
    router.put('/tags/:id', [BlogController, 'updateTag']).use(apiThrottle)

    // 删除标签
    router.delete('/tags/:id', [BlogController, 'deleteTag']).use(apiThrottle)
  })
  .prefix('/api')
