import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'A record with this value already exists',
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
      })
    }
    if (err.code === 'P2023') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ID format',
      })
    }
  }

  console.error('ERROR:', err)

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  })
}
