import type { HttpContext } from '@adonisjs/core/http'

export type ValidatedContext<T = any> = HttpContext & {
  validated: T
}

export type RouteHandler = [() => Promise<any>, string]
