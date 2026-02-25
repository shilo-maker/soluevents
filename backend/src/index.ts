import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import eventRoutes from './routes/events'
import tourRoutes from './routes/tours'
import taskRoutes from './routes/tasks'
import userRoutes from './routes/users'
import roleAssignmentRoutes from './routes/roleAssignments'
import contactRoutes from './routes/contactRoutes'
import venueRoutes from './routes/venueRoutes'
import integrationRoutes from './routes/integration'
import { errorHandler } from './middleware/errorHandler'
import prisma from './lib/prisma'

dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
const missing = requiredEnvVars.filter(v => !process.env[v])
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const app = express()
const port = process.env.PORT || 3000

// Security middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'SoluPlan API is running' })
})

// API Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/tours', tourRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/users', userRoutes)
app.use('/api/role-assignments', roleAssignmentRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/venues', venueRoutes)
app.use('/api/integration', integrationRoutes)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: 'Route not found' })
})

// Error handling middleware
app.use(errorHandler)

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...')
  server.close(() => {
    prisma.$disconnect().then(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 10000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})
