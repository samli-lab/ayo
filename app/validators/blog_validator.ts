import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

// 获取文章列表查询参数验证
export const getPostsQuerySchema = vine.object({
  page: vine.number().min(1).optional(),
  pageSize: vine.number().min(1).max(100).optional(),
  category: vine.string().trim().optional(),
  tag: vine.string().trim().optional(),
  search: vine.string().trim().optional(),
})

// 搜索文章查询参数验证
export const searchPostsQuerySchema = vine.object({
  q: vine.string().trim().minLength(1),
  page: vine.number().min(1).optional(),
  pageSize: vine.number().min(1).max(100).optional(),
})

// 路径参数验证（slug）
export const slugParamsSchema = vine.object({
  slug: vine.string().trim().minLength(1),
})

// 路径参数验证（category）
export const categoryParamsSchema = vine.object({
  category: vine.string().trim().minLength(1),
})

// 路径参数验证（tag）
export const tagParamsSchema = vine.object({
  tag: vine.string().trim().minLength(1),
})

// 分类文章列表查询参数验证
export const categoryPostsQuerySchema = vine.object({
  page: vine.number().min(1).optional(),
  pageSize: vine.number().min(1).max(100).optional(),
})

// 标签文章列表查询参数验证
export const tagPostsQuerySchema = vine.object({
  page: vine.number().min(1).optional(),
  pageSize: vine.number().min(1).max(100).optional(),
})

export const getPostsQueryValidator = vine.compile(getPostsQuerySchema)
export const searchPostsQueryValidator = vine.compile(searchPostsQuerySchema)
export const slugParamsValidator = vine.compile(slugParamsSchema)
export const categoryParamsValidator = vine.compile(categoryParamsSchema)
export const tagParamsValidator = vine.compile(tagParamsSchema)
export const categoryPostsQueryValidator = vine.compile(categoryPostsQuerySchema)
export const tagPostsQueryValidator = vine.compile(tagPostsQuerySchema)

export type GetPostsQueryValidation = Infer<typeof getPostsQuerySchema>
export type SearchPostsQueryValidation = Infer<typeof searchPostsQuerySchema>
export type SlugParamsValidation = Infer<typeof slugParamsSchema>
export type CategoryParamsValidation = Infer<typeof categoryParamsSchema>
export type TagParamsValidation = Infer<typeof tagParamsSchema>
export type CategoryPostsQueryValidation = Infer<typeof categoryPostsQuerySchema>
export type TagPostsQueryValidation = Infer<typeof tagPostsQuerySchema>
