import type { HttpContext } from '@adonisjs/core/http'
import Category from '#models/blog/category'
import {
  createCategoryValidator,
  updateCategoryValidator,
  idParamsValidator,
} from '#validators/blog_validator'

export default class CategoriesController {
  /**
   * @index
   * @summary 获取分类列表
   * @description 获取所有分类及其文章数量
   * @responseBody 200 - {"code": 200, "message": "success", "data": [{"id": 0}]}
   */
  async index(ctx: HttpContext) {
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
   * @store
   * @summary 创建分类
   * @description 创建新分类
   * @requestBody {"name": "技术", "description": "技术相关文章"}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": 0}}
   * @responseBody 400 - {"code": 400, "message": "Category already exists", "data": {"error": "Invalid data"}}
   */
  async store(ctx: HttpContext) {
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
   * @update
   * @summary 更新分类
   * @description 更新分类信息
   * @paramPath id - 分类ID - @type(string) @required
   * @requestBody {"name": "Updated Name", "description": "Updated Description"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Category not found", "data": {"error": "Not found"}}
   */
  async update(ctx: HttpContext) {
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
   * @destroy
   * @summary 删除分类
   * @description 删除指定分类
   * @paramPath id - 分类ID - @type(string) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "Category not found", "data": {"error": "Not found"}}
   */
  async destroy(ctx: HttpContext) {
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
}

