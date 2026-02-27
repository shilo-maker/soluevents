import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  sendInvitations,
  getEventInvitations,
  getInvitationByToken,
  submitInvitationResponse,
} from '../controllers/invitationController'

const router = Router()

// Authenticated routes
router.post('/events/:eventId/send', authenticate, sendInvitations)
router.get('/events/:eventId', authenticate, getEventInvitations)

// Public routes (token-based, no auth)
router.get('/:token', getInvitationByToken)
router.post('/:token/respond', submitInvitationResponse)

export default router
