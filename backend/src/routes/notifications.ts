import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
} from '../controllers/notificationController'

const router = Router()

router.use(authenticate)

router.get('/', listNotifications)
router.get('/unread-count', getUnreadCount)
router.post('/read-all', markAllAsRead)
router.delete('/', clearAll)
router.post('/:id/read', markAsRead)
router.delete('/:id', deleteOne)

export default router
