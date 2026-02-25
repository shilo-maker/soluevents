import { Router } from 'express'
import { register, login, refreshToken, me } from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/schemas'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', validate(refreshTokenSchema), refreshToken)
router.get('/me', authenticate, me)

export default router
