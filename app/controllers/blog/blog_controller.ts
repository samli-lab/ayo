import type { HttpContext } from '@adonisjs/core/http'
import Post from '#models/blog/post'
import Category from '#models/blog/category'
import Tag from '#models/blog/tag'
import {
  getPostsQueryValidator,
  searchPostsQueryValidator,
  slugParamsValidator,
  categoryParamsValidator,
  tagParamsValidator,
  categoryPostsQueryValidator,
  tagPostsQueryValidator,
} from '#validators/blog_validator'

export default class BlogController {
  /**
   * @getPosts
   * @summary 获取文章列表
   * @description 获取文章列表，支持分页和筛选
   * @paramQuery page - 页码 - @type(number) @optional
   * @paramQuery pageSize - 每页数量 - @type(number) @optional
   * @paramQuery category - 分类筛选 - @type(string) @optional
   * @paramQuery tag - 标签筛选 - @type(string) @optional
   * @paramQuery search - 搜索关键词 - @type(string) @optional
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"posts": [{"id": 0}], "pagination": {"page": 0}}}
   */
  async getPosts(ctx: HttpContext) {
    const validated = await getPostsQueryValidator.validate(ctx.request.qs())
    const page = validated.page || 1
    const pageSize = validated.pageSize || 6

    let query = Post.query().preload('category').preload('tags')

    // 分类筛选
    if (validated.category) {
      const categoryRecord = await Category.findBy('name', validated.category)
      if (categoryRecord) {
        query = query.where('category_id', categoryRecord.id)
      } else {
        // 如果分类不存在，返回空结果
        query = query.where('id', 0)
      }
    }

    // 标签筛选
    if (validated.tag) {
      const tagRecord = await Tag.findBy('name', validated.tag)
      if (tagRecord) {
        query = query.whereIn('id', (subQuery) => {
          subQuery.from('post_tags').select('post_id').where('tag_id', tagRecord.id)
        })
      } else {
        // 如果标签不存在，返回空结果
        query = query.where('id', 0)
      }
    }

    // 搜索筛选
    if (validated.search) {
      query = query.where((builder) => {
        builder
          .whereILike('title', `%${validated.search}%`)
          .orWhereILike('excerpt', `%${validated.search}%`)
          .orWhereILike('content', `%${validated.search}%`)
      })
    }

    // 按日期倒序排列
    query = query.orderBy('date', 'desc')

    const posts = await query.paginate(page, pageSize)

    const postsData = posts.all().map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      imageUrl: post.imageUrl || undefined,
      readTime: post.readTime || undefined,
      tags: post.tags.map((tag) => tag.name),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        posts: postsData,
        pagination: {
          page: posts.currentPage,
          pageSize: posts.perPage,
          total: posts.total,
          totalPages: posts.lastPage,
        },
      },
    })
  }

  /**
   * @getPostBySlug
   * @summary 获取文章详情
   * @description 根据 slug 获取文章完整内容
   * @paramPath slug - 文章的唯一标识符 - @type(string) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Article not found", "data": {"error": "Not found"}}
   */
  async getPostBySlug(ctx: HttpContext) {
    const { slug } = await slugParamsValidator.validate(ctx.params)

    const post = await Post.query().where('slug', slug).preload('category').preload('tags').first()

    if (!post) {
      return ctx.response.status(404).json({
        code: 404,
        message: '文章未找到',
        data: null,
      })
    }

    // 增加阅读量
    post.views += 1
    await post.save()

    const postData = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      readTime: post.readTime || '',
      imageUrl: post.imageUrl || '',
      content: post.content,
      excerpt: post.excerpt || undefined,
      tags: post.tags.map((tag) => tag.name),
      author: post.authorName
        ? {
            name: post.authorName,
            avatar: post.authorAvatar || undefined,
          }
        : undefined,
      views: post.views,
      likes: post.likes,
    }

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: postData,
    })
  }

  /**
   * @getSidebar
   * @summary 获取侧边栏数据
   * @description 获取侧边栏所需的所有数据（个人信息、统计、最近文章、标签等）
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   */
  async getSidebar(ctx: HttpContext) {
    // 获取统计数据
    const articlesCount = await Post.query().count('* as total')
    const tagsCount = await Tag.query().count('* as total')
    const categoriesCount = await Category.query().count('* as total')

    // 获取最近5篇文章
    const recentPosts = await Post.query().orderBy('date', 'desc').limit(5).preload('category')

    // 获取所有标签（带文章数量）
    const tags = await Tag.query().withCount('posts').orderBy('name', 'asc')

    // 获取所有分类（带文章数量）
    const categories = await Category.query().withCount('posts').orderBy('name', 'asc')

    // TODO: 这些信息应该从配置或数据库中获取
    const profile = {
      name: 'Sam',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'A Simple and Card UI Design theme for Hexo',
      socialLinks: {
        github: 'https://github.com/yourusername',
        email: 'mailto:your@email.com',
        twitter: 'https://twitter.com/yourusername',
      },
    }

    const statistics = {
      articles: Number(articlesCount[0].$extras.total),
      tags: Number(tagsCount[0].$extras.total),
      categories: Number(categoriesCount[0].$extras.total),
    }

    const recentPostsData = recentPosts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      imageUrl: post.imageUrl || undefined,
    }))

    const tagsData = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      count: Number(tag.$extras.posts_count || 0),
    }))

    const categoriesData = categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: Number(category.$extras.posts_count || 0),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        profile,
        statistics,
        recentPosts: recentPostsData,
        tags: tagsData,
        categories: categoriesData,
        announcement: 'This is a replica of the Butterfly theme using Material UI and Next.js.',
      },
    })
  }

  /**
   * @getCategories
   * @summary 获取分类列表
   * @description 获取所有分类及其文章数量
   * @responseBody 200 - {"code": 200, "message": "success", "data": [{"id": 0}]}
   */
  async getCategories(ctx: HttpContext) {
    const categories = await Category.query().withCount('posts').orderBy('name', 'asc')

    const categoriesData = categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: Number(category.$extras.posts_count || 0),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: categoriesData,
    })
  }

  /**
   * @getTags
   * @summary 获取标签列表
   * @description 获取所有标签及其使用次数
   * @responseBody 200 - {"code": 200, "message": "success", "data": [{"id": 0}]}
   */
  async getTags(ctx: HttpContext) {
    const tags = await Tag.query().withCount('posts').orderBy('name', 'asc')

    const tagsData = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      count: Number(tag.$extras.posts_count || 0),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: tagsData,
    })
  }

  /**
   * @getPostsByCategory
   * @summary 根据分类获取文章列表
   * @description 获取指定分类下的文章列表
   * @paramPath category - 分类名称 - @type(string) @required
   * @paramQuery page - 页码 - @type(number) @optional
   * @paramQuery pageSize - 每页数量 - @type(number) @optional
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"posts": [{"id": 0}], "pagination": {"page": 0}}}
   */
  async getPostsByCategory(ctx: HttpContext) {
    const { category } = await categoryParamsValidator.validate(ctx.params)
    const validated = await categoryPostsQueryValidator.validate(ctx.request.qs())
    const page = validated.page || 1
    const pageSize = validated.pageSize || 6

    // 先查找分类
    const categoryRecord = await Category.findBy('name', category)
    if (!categoryRecord) {
      return ctx.response.status(404).json({
        code: 404,
        message: '分类未找到',
        data: null,
      })
    }

    const posts = await Post.query()
      .where('category_id', categoryRecord.id)
      .preload('category')
      .preload('tags')
      .orderBy('date', 'desc')
      .paginate(page, pageSize)

    const postsData = posts.all().map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      imageUrl: post.imageUrl || undefined,
      readTime: post.readTime || undefined,
      tags: post.tags.map((tag) => tag.name),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        posts: postsData,
        pagination: {
          page: posts.currentPage,
          pageSize: posts.perPage,
          total: posts.total,
          totalPages: posts.lastPage,
        },
      },
    })
  }

  /**
   * @getPostsByTag
   * @summary 根据标签获取文章列表
   * @description 获取指定标签下的文章列表
   * @paramPath tag - 标签名称 - @type(string) @required
   * @paramQuery page - 页码 - @type(number) @optional
   * @paramQuery pageSize - 每页数量 - @type(number) @optional
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"posts": [{"id": 0}], "pagination": {"page": 0}}}
   */
  async getPostsByTag(ctx: HttpContext) {
    const { tag } = await tagParamsValidator.validate(ctx.params)
    const validated = await tagPostsQueryValidator.validate(ctx.request.qs())
    const page = validated.page || 1
    const pageSize = validated.pageSize || 6

    // 先查找标签
    const tagRecord = await Tag.findBy('name', tag)
    if (!tagRecord) {
      return ctx.response.status(404).json({
        code: 404,
        message: '标签未找到',
        data: null,
      })
    }

    const posts = await Post.query()
      .whereIn('id', (subQuery) => {
        subQuery.from('post_tags').select('post_id').where('tag_id', tagRecord.id)
      })
      .preload('category')
      .preload('tags')
      .orderBy('date', 'desc')
      .paginate(page, pageSize)

    const postsData = posts.all().map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      imageUrl: post.imageUrl || undefined,
      readTime: post.readTime || undefined,
      tags: post.tags.map((tagItem) => tagItem.name),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        posts: postsData,
        pagination: {
          page: posts.currentPage,
          pageSize: posts.perPage,
          total: posts.total,
          totalPages: posts.lastPage,
        },
      },
    })
  }

  /**
   * @searchPosts
   * @summary 搜索文章
   * @description 根据关键词搜索文章
   * @paramQuery q - 搜索关键词 - @type(string) @required
   * @paramQuery page - 页码 - @type(number) @optional
   * @paramQuery pageSize - 每页数量 - @type(number) @optional
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"posts": [{"id": 0}], "pagination": {"page": 0}}}
   */
  async searchPosts(ctx: HttpContext) {
    const validated = await searchPostsQueryValidator.validate(ctx.request.qs())
    const page = validated.page || 1
    const pageSize = validated.pageSize || 6

    const posts = await Post.query()
      .where((builder) => {
        builder
          .whereILike('title', `%${validated.q}%`)
          .orWhereILike('excerpt', `%${validated.q}%`)
          .orWhereILike('content', `%${validated.q}%`)
      })
      .preload('category')
      .preload('tags')
      .orderBy('date', 'desc')
      .paginate(page, pageSize)

    const postsData = posts.all().map((post) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      date: post.date.toFormat('yyyy-MM-dd'),
      category: post.category?.name || '',
      imageUrl: post.imageUrl || undefined,
      readTime: post.readTime || undefined,
      tags: post.tags.map((tag) => tag.name),
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        posts: postsData,
        pagination: {
          page: posts.currentPage,
          pageSize: posts.perPage,
          total: posts.total,
          totalPages: posts.lastPage,
        },
      },
    })
  }
}
