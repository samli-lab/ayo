import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

// 获取相册列表查询参数验证
export const getGalleryQuerySchema = vine.object({
  page: vine.number().min(1).optional(),
  pageSize: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().optional(),
})

// 创建相册照片验证
export const createGallerySchema = vine.object({
  title: vine.string().trim().minLength(1),
  description: vine.string().trim().optional(),
  url: vine.string().trim().url(),
  sortOrder: vine.number().optional(),
})

// 更新相册照片验证
export const updateGallerySchema = vine.object({
  title: vine.string().trim().minLength(1).optional(),
  description: vine.string().trim().optional(),
  url: vine.string().trim().url().optional(),
  sortOrder: vine.number().optional(),
})

export const getGalleryQueryValidator = vine.compile(getGalleryQuerySchema)
export const createGalleryValidator = vine.compile(createGallerySchema)
export const updateGalleryValidator = vine.compile(updateGallerySchema)

export type GetGalleryQueryValidation = Infer<typeof getGalleryQuerySchema>
export type CreateGalleryValidation = Infer<typeof createGallerySchema>
export type UpdateGalleryValidation = Infer<typeof updateGallerySchema>

