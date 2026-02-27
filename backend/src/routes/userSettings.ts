import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getUserEmailSettings,
  updateUserEmailSettings,
  testUserEmailSettings,
} from '../controllers/userSettingsController'

const router = Router()

router.use(authenticate)

router.get('/email-settings', getUserEmailSettings)
router.patch('/email-settings', updateUserEmailSettings)
router.post('/email-settings/test', testUserEmailSettings)

export default router
