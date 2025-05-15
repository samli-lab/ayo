import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'

const userSchema = vine.object({
  name: vine.string().trim().minLength(2).maxLength(50),
  age: vine.number().positive().max(120),
})

export const testValidator = vine.compile(userSchema)
export type UserValidation = Infer<typeof userSchema>
