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

// 创建文章请求体验证
export const createPostSchema = vine.object({
  slug: vine.string().trim().minLength(1),
  title: vine.string().trim().minLength(1),
  excerpt: vine.string().trim().optional(),
  content: vine.string().trim().minLength(1),
  categoryId: vine.number().optional(),
  imageUrl: vine.string().trim().url().optional(),
  readTime: vine.string().trim().optional(),
  authorName: vine.string().trim().optional(),
  authorAvatar: vine.string().trim().url().optional(),
  date: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  tagIds: vine.array(vine.number()).optional(),
})

// 更新文章请求体验证
export const updatePostSchema = vine.object({
  slug: vine.string().trim().minLength(1).optional(),
  title: vine.string().trim().minLength(1).optional(),
  excerpt: vine.string().trim().optional(),
  content: vine.string().trim().minLength(1).optional(),
  categoryId: vine.number().optional(),
  imageUrl: vine.string().trim().url().optional(),
  readTime: vine.string().trim().optional(),
  authorName: vine.string().trim().optional(),
  authorAvatar: vine.string().trim().url().optional(),
  date: vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tagIds: vine.array(vine.number()).optional(),
})

// 创建分类请求体验证
export const createCategorySchema = vine.object({
  name: vine.string().trim().minLength(1),
  description: vine.string().trim().optional(),
})

// 更新分类请求体验证
export const updateCategorySchema = vine.object({
  name: vine.string().trim().minLength(1).optional(),
  description: vine.string().trim().optional(),
})

// 创建标签请求体验证
export const createTagSchema = vine.object({
  name: vine.string().trim().minLength(1),
  description: vine.string().trim().optional(),
})

// 更新标签请求体验证
export const updateTagSchema = vine.object({
  name: vine.string().trim().minLength(1).optional(),
  description: vine.string().trim().optional(),
})

// ID 路径参数验证
export const idParamsSchema = vine.object({
  id: vine.number(),
})

export const getPostsQueryValidator = vine.compile(getPostsQuerySchema)
export const searchPostsQueryValidator = vine.compile(searchPostsQuerySchema)
export const slugParamsValidator = vine.compile(slugParamsSchema)
export const categoryParamsValidator = vine.compile(categoryParamsSchema)
export const tagParamsValidator = vine.compile(tagParamsSchema)
export const categoryPostsQueryValidator = vine.compile(categoryPostsQuerySchema)
export const tagPostsQueryValidator = vine.compile(tagPostsQuerySchema)
export const createPostValidator = vine.compile(createPostSchema)
export const updatePostValidator = vine.compile(updatePostSchema)
export const createCategoryValidator = vine.compile(createCategorySchema)
export const updateCategoryValidator = vine.compile(updateCategorySchema)
export const createTagValidator = vine.compile(createTagSchema)
export const updateTagValidator = vine.compile(updateTagSchema)
export const idParamsValidator = vine.compile(idParamsSchema)

export type GetPostsQueryValidation = Infer<typeof getPostsQuerySchema>
export type SearchPostsQueryValidation = Infer<typeof searchPostsQuerySchema>
export type SlugParamsValidation = Infer<typeof slugParamsSchema>
export type CategoryParamsValidation = Infer<typeof categoryParamsSchema>
export type TagParamsValidation = Infer<typeof tagParamsSchema>
export type CategoryPostsQueryValidation = Infer<typeof categoryPostsQuerySchema>
export type TagPostsQueryValidation = Infer<typeof tagPostsQuerySchema>
export type CreatePostValidation = Infer<typeof createPostSchema>
export type UpdatePostValidation = Infer<typeof updatePostSchema>
export type CreateCategoryValidation = Infer<typeof createCategorySchema>
export type UpdateCategoryValidation = Infer<typeof updateCategorySchema>
export type CreateTagValidation = Infer<typeof createTagSchema>
export type UpdateTagValidation = Infer<typeof updateTagSchema>
export type IdParamsValidation = Infer<typeof idParamsSchema>
