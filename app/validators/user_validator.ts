import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

// 用户数据验证器
const userSchema = vine.object({
  name: vine.string().trim().minLength(2).maxLength(50),
  age: vine.number().positive().max(120),
})

// 路径参数验证器
const pathParamsSchema = vine.object({
  id: vine.string().uuid(),
})

const translationSchema = vine.object({
  text: vine.string().trim().minLength(2).maxLength(50),
  provider: vine.string().trim().minLength(2).maxLength(50),
})

export const testValidator = vine.compile(userSchema)
export const pathParamsValidator = vine.compile(pathParamsSchema)
export const translationValidator = vine.compile(translationSchema)

export type UserValidation = Infer<typeof userSchema>
export type PathParamsValidation = Infer<typeof pathParamsSchema>
