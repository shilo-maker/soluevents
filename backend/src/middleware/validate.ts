import { Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { AuthRequest } from './auth'

export const validate = (schema: ZodSchema) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return _res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(error)
    }
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return _res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        })
      }
      next(error)
    }
  }
}
