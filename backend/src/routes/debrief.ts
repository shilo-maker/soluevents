import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getDebrief,
  createDebrief,
  updateDebrief,
  sendDebrief,
  getResponses,
  submitResponse,
} from '../controllers/debriefController'

const router = Router()

router.use(authenticate)

router.get('/:eventId/debrief', getDebrief)
router.post('/:eventId/debrief', createDebrief)
router.put('/:eventId/debrief/:debriefId', updateDebrief)
router.post('/:eventId/debrief/:debriefId/send', sendDebrief)
router.get('/:eventId/debrief/:debriefId/responses', getResponses)
router.post('/:eventId/debrief/:debriefId/respond', submitResponse)

export default router
