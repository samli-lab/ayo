import vine from '@vinejs/vine'

export const testValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(50),
    age: vine.number().positive().max(120),
  })
)
