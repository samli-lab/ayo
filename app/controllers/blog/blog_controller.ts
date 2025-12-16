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
  createPostValidator,
  updatePostValidator,
  createCategoryValidator,
  updateCategoryValidator,
  createTagValidator,
  updateTagValidator,
  idParamsValidator,
} from '#validators/blog_validator'
import { DateTime } from 'luxon'

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

  /**
   * @createPost
   * @summary 创建文章
   * @description 创建新文章
   * @requestBody {"slug": "example-post", "title": "Example Post", "content": "Content", "date": "2024-01-01"}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": 0}}
   * @responseBody 400 - {"code": 400, "message": "Validation error", "data": {"error": "Invalid data"}}
   */
  async createPost(ctx: HttpContext) {
    const validated = await createPostValidator.validate(ctx.request.body())

    // 检查 slug 是否已存在
    const existingPost = await Post.findBy('slug', validated.slug)
    if (existingPost) {
      return ctx.response.status(400).json({
        code: 400,
        message: 'slug 已存在',
        data: null,
      })
    }

    // 检查分类是否存在
    if (validated.categoryId) {
      const category = await Category.find(validated.categoryId)
      if (!category) {
        return ctx.response.status(400).json({
          code: 400,
          message: '分类不存在',
          data: null,
        })
      }
    }

    // 创建文章
    const post = await Post.create({
      slug: validated.slug,
      title: validated.title,
      excerpt: validated.excerpt || null,
      content: validated.content,
      categoryId: validated.categoryId || null,
      imageUrl: validated.imageUrl || null,
      readTime: validated.readTime || null,
      authorName: validated.authorName || null,
      authorAvatar: validated.authorAvatar || null,
      date: DateTime.fromISO(validated.date),
      views: 0,
      likes: 0,
    })

    // 关联标签
    if (validated.tagIds && validated.tagIds.length > 0) {
      const tags = await Tag.query().whereIn('id', validated.tagIds)
      await post.related('tags').attach(tags.map((tag) => tag.id))
    }

    return ctx.response.status(201).json({
      code: 201,
      message: 'success',
      data: {
        id: post.id,
        slug: post.slug,
        title: post.title,
      },
    })
  }

  /**
   * @updatePost
   * @summary 更新文章
   * @description 更新文章信息
   * @paramPath id - 文章ID - @type(number) @required
   * @requestBody {"title": "Updated Title", "content": "Updated Content"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Article not found", "data": {"error": "Not found"}}
   */
  async updatePost(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const validated = await updatePostValidator.validate(ctx.request.body())

    const post = await Post.find(id)
    if (!post) {
      return ctx.response.status(404).json({
        code: 404,
        message: '文章未找到',
        data: null,
      })
    }

    // 如果更新 slug，检查是否已存在
    if (validated.slug && validated.slug !== post.slug) {
      const existingPost = await Post.findBy('slug', validated.slug)
      if (existingPost) {
        return ctx.response.status(400).json({
          code: 400,
          message: 'slug 已存在',
          data: null,
        })
      }
    }

    // 检查分类是否存在
    if (validated.categoryId !== undefined) {
      if (validated.categoryId !== null) {
        const category = await Category.find(validated.categoryId)
        if (!category) {
          return ctx.response.status(400).json({
            code: 400,
            message: '分类不存在',
            data: null,
          })
        }
      }
    }

    // 更新文章
    post.merge({
      slug: validated.slug || post.slug,
      title: validated.title || post.title,
      excerpt: validated.excerpt !== undefined ? validated.excerpt : post.excerpt,
      content: validated.content || post.content,
      categoryId: validated.categoryId !== undefined ? validated.categoryId : post.categoryId,
      imageUrl: validated.imageUrl !== undefined ? validated.imageUrl : post.imageUrl,
      readTime: validated.readTime !== undefined ? validated.readTime : post.readTime,
      authorName: validated.authorName !== undefined ? validated.authorName : post.authorName,
      authorAvatar:
        validated.authorAvatar !== undefined ? validated.authorAvatar : post.authorAvatar,
      date: validated.date ? DateTime.fromISO(validated.date) : post.date,
    })
    await post.save()

    // 更新标签关联
    if (validated.tagIds !== undefined) {
      await post.related('tags').detach()
      if (validated.tagIds.length > 0) {
        const tags = await Tag.query().whereIn('id', validated.tagIds)
        await post.related('tags').attach(tags.map((tag) => tag.id))
      }
    }

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        id: post.id,
        slug: post.slug,
        title: post.title,
      },
    })
  }

  /**
   * @deletePost
   * @summary 删除文章
   * @description 删除指定文章
   * @paramPath id - 文章ID - @type(number) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "Article not found", "data": {"error": "Not found"}}
   */
  async deletePost(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)

    const post = await Post.find(id)
    if (!post) {
      return ctx.response.status(404).json({
        code: 404,
        message: '文章未找到',
        data: null,
      })
    }

    // 删除标签关联
    await post.related('tags').detach()
    // 删除文章
    await post.delete()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: null,
    })
  }

  /**
   * @createCategory
   * @summary 创建分类
   * @description 创建新分类
   * @requestBody {"name": "技术", "description": "技术相关文章"}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": 0}}
   * @responseBody 400 - {"code": 400, "message": "Category already exists", "data": {"error": "Invalid data"}}
   */
  async createCategory(ctx: HttpContext) {
    const validated = await createCategoryValidator.validate(ctx.request.body())

    // 检查分类名是否已存在
    const existingCategory = await Category.findBy('name', validated.name)
    if (existingCategory) {
      return ctx.response.status(400).json({
        code: 400,
        message: '分类名已存在',
        data: null,
      })
    }

    const category = await Category.create({
      name: validated.name,
      description: validated.description || null,
    })

    return ctx.response.status(201).json({
      code: 201,
      message: 'success',
      data: {
        id: category.id,
        name: category.name,
      },
    })
  }

  /**
   * @updateCategory
   * @summary 更新分类
   * @description 更新分类信息
   * @paramPath id - 分类ID - @type(number) @required
   * @requestBody {"name": "Updated Name", "description": "Updated Description"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Category not found", "data": {"error": "Not found"}}
   */
  async updateCategory(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const validated = await updateCategoryValidator.validate(ctx.request.body())

    const category = await Category.find(id)
    if (!category) {
      return ctx.response.status(404).json({
        code: 404,
        message: '分类未找到',
        data: null,
      })
    }

    // 如果更新名称，检查是否已存在
    if (validated.name && validated.name !== category.name) {
      const existingCategory = await Category.findBy('name', validated.name)
      if (existingCategory) {
        return ctx.response.status(400).json({
          code: 400,
          message: '分类名已存在',
          data: null,
        })
      }
    }

    category.merge({
      name: validated.name || category.name,
      description:
        validated.description !== undefined ? validated.description : category.description,
    })
    await category.save()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        id: category.id,
        name: category.name,
      },
    })
  }

  /**
   * @deleteCategory
   * @summary 删除分类
   * @description 删除指定分类
   * @paramPath id - 分类ID - @type(number) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "Category not found", "data": {"error": "Not found"}}
   */
  async deleteCategory(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)

    const category = await Category.find(id)
    if (!category) {
      return ctx.response.status(404).json({
        code: 404,
        message: '分类未找到',
        data: null,
      })
    }

    await category.delete()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: null,
    })
  }

  /**
   * @createTag
   * @summary 创建标签
   * @description 创建新标签
   * @requestBody {"name": "React", "description": "React相关文章"}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": 0}}
   * @responseBody 400 - {"code": 400, "message": "Tag already exists", "data": {"error": "Invalid data"}}
   */
  async createTag(ctx: HttpContext) {
    const validated = await createTagValidator.validate(ctx.request.body())

    // 检查标签名是否已存在
    const existingTag = await Tag.findBy('name', validated.name)
    if (existingTag) {
      return ctx.response.status(400).json({
        code: 400,
        message: '标签名已存在',
        data: null,
      })
    }

    const tag = await Tag.create({
      name: validated.name,
      description: validated.description || null,
    })

    return ctx.response.status(201).json({
      code: 201,
      message: 'success',
      data: {
        id: tag.id,
        name: tag.name,
      },
    })
  }

  /**
   * @updateTag
   * @summary 更新标签
   * @description 更新标签信息
   * @paramPath id - 标签ID - @type(number) @required
   * @requestBody {"name": "Updated Name", "description": "Updated Description"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Tag not found", "data": {"error": "Not found"}}
   */
  async updateTag(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const validated = await updateTagValidator.validate(ctx.request.body())

    const tag = await Tag.find(id)
    if (!tag) {
      return ctx.response.status(404).json({
        code: 404,
        message: '标签未找到',
        data: null,
      })
    }

    // 如果更新名称，检查是否已存在
    if (validated.name && validated.name !== tag.name) {
      const existingTag = await Tag.findBy('name', validated.name)
      if (existingTag) {
        return ctx.response.status(400).json({
          code: 400,
          message: '标签名已存在',
          data: null,
        })
      }
    }

    tag.merge({
      name: validated.name || tag.name,
      description: validated.description !== undefined ? validated.description : tag.description,
    })
    await tag.save()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        id: tag.id,
        name: tag.name,
      },
    })
  }

  /**
   * @deleteTag
   * @summary 删除标签
   * @description 删除指定标签
   * @paramPath id - 标签ID - @type(number) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "Tag not found", "data": {"error": "Not found"}}
   */
  async deleteTag(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)

    const tag = await Tag.find(id)
    if (!tag) {
      return ctx.response.status(404).json({
        code: 404,
        message: '标签未找到',
        data: null,
      })
    }

    await tag.delete()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: null,
    })
  }
}
