import type { HttpContext } from '@adonisjs/core/http'
import Tag from '#models/blog/tag'
import {
  createTagValidator,
  updateTagValidator,
  idParamsValidator,
} from '#validators/blog_validator'

export default class TagsController {
  /**
   * @index
   * @summary 获取标签列表
   * @description 获取所有标签及其使用次数
   * @responseBody 200 - {"code": 200, "message": "success", "data": [{"id": 0}]}
   */
  async index(ctx: HttpContext) {
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
   * @store
   * @summary 创建标签
   * @description 创建新标签
   * @requestBody {"name": "React", "description": "React相关文章"}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": 0}}
   * @responseBody 400 - {"code": 400, "message": "Tag already exists", "data": {"error": "Invalid data"}}
   */
  async store(ctx: HttpContext) {
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
   * @update
   * @summary 更新标签
   * @description 更新标签信息
   * @paramPath id - 标签ID - @type(string) @required
   * @requestBody {"name": "Updated Name", "description": "Updated Description"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": 0}}
   * @responseBody 404 - {"code": 404, "message": "Tag not found", "data": {"error": "Not found"}}
   */
  async update(ctx: HttpContext) {
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
   * @destroy
   * @summary 删除标签
   * @description 删除指定标签
   * @paramPath id - 标签ID - @type(string) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "Tag not found", "data": {"error": "Not found"}}
   */
  async destroy(ctx: HttpContext) {
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

