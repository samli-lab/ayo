import type { HttpContext } from '@adonisjs/core/http'
import Gallery from '#models/blog/gallery'
import {
  getGalleryQueryValidator,
  createGalleryValidator,
  updateGalleryValidator,
} from '#validators/gallery_validator'
import { idParamsValidator } from '#validators/blog_validator'
import { DateTime } from 'luxon'

export default class GalleryController {
  /**
   * @index
   * @summary 获取相册照片列表
   * @description 获取相册所有照片列表，支持分页和搜索
   * @paramQuery page - 页码 - @type(number) @optional
   * @paramQuery pageSize - 每页数量 - @type(number) @optional
   * @paramQuery search - 搜索关键词 - @type(string) @optional
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"photos": [{"id": ""}], "pagination": {"total": 0}}}
   */
  async index(ctx: HttpContext) {
    const validated = await getGalleryQueryValidator.validate(ctx.request.qs())
    const page = validated.page || 1
    const pageSize = validated.pageSize || 12

    let query = Gallery.query().whereNull('deleted_at')

    if (validated.search) {
      query = query.where((builder) => {
        builder
          .whereILike('title', `%${validated.search}%`)
          .orWhereILike('description', `%${validated.search}%`)
      })
    }

    // 按排序号正序，日期倒序
    query = query.orderBy('sort_order', 'asc').orderBy('created_at', 'desc')

    const photos = await query.paginate(page, pageSize)

    const photosData = photos.all().map((photo) => ({
      id: photo.id,
      title: photo.title,
      description: photo.description,
      url: photo.url,
    }))

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: {
        photos: photosData,
        pagination: {
          page: photos.currentPage,
          pageSize: photos.perPage,
          total: photos.total,
          totalPages: photos.lastPage,
        },
      },
    })
  }

  /**
   * @store
   * @summary 添加照片
   * @description 向相册添加新照片
   * @requestBody {"title": "照片标题", "url": "https://example.com/photo.jpg", "description": "描述", "sortOrder": 0}
   * @responseBody 201 - {"code": 201, "message": "success", "data": {"id": ""}}
   */
  async store(ctx: HttpContext) {
    const validated = await createGalleryValidator.validate(ctx.request.body())

    const photo = await Gallery.create({
      title: validated.title,
      description: validated.description || null,
      url: validated.url,
      sortOrder: validated.sortOrder || 0,
    })

    return ctx.response.status(201).json({
      code: 201,
      message: 'success',
      data: photo,
    })
  }

  /**
   * @show
   * @summary 获取单张照片详情
   * @description 根据 ID 获取照片详细信息
   * @paramPath id - 照片 ID - @type(string) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": ""}}
   * @responseBody 404 - {"code": 404, "message": "照片未找到", "data": {"error": "Not found"}}
   */
  async show(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const photo = await Gallery.query().where('id', id).whereNull('deleted_at').first()

    if (!photo) {
      return ctx.response.status(404).json({
        code: 404,
        message: '照片未找到',
        data: null,
      })
    }

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: photo,
    })
  }

  /**
   * @update
   * @summary 更新照片信息
   * @description 更新指定 ID 的照片信息
   * @paramPath id - 照片 ID - @type(string) @required
   * @requestBody {"title": "新标题", "description": "新描述"}
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"id": ""}}
   * @responseBody 404 - {"code": 404, "message": "照片未找到", "data": {"error": "Not found"}}
   */
  async update(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const validated = await updateGalleryValidator.validate(ctx.request.body())

    const photo = await Gallery.query().where('id', id).whereNull('deleted_at').first()

    if (!photo) {
      return ctx.response.status(404).json({
        code: 404,
        message: '照片未找到',
        data: null,
      })
    }

    photo.merge({
      title: validated.title || photo.title,
      description: validated.description !== undefined ? validated.description : photo.description,
      url: validated.url || photo.url,
      sortOrder: validated.sortOrder !== undefined ? validated.sortOrder : photo.sortOrder,
    })

    await photo.save()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: photo,
    })
  }

  /**
   * @destroy
   * @summary 删除照片
   * @description 软删除指定 ID 的照片
   * @paramPath id - 照片 ID - @type(string) @required
   * @responseBody 200 - {"code": 200, "message": "success", "data": {"success": true}}
   * @responseBody 404 - {"code": 404, "message": "照片未找到", "data": {"error": "Not found"}}
   */
  async destroy(ctx: HttpContext) {
    const { id } = await idParamsValidator.validate(ctx.params)
    const photo = await Gallery.query().where('id', id).whereNull('deleted_at').first()

    if (!photo) {
      return ctx.response.status(404).json({
        code: 404,
        message: '照片未找到',
        data: null,
      })
    }

    // 软删除
    photo.deletedAt = DateTime.now()
    await photo.save()

    return ctx.response.json({
      code: 200,
      message: 'success',
      data: null,
    })
  }
}
