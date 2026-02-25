import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createEventSchema, updateEventSchema } from '../validators/schemas'
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController'

const router = Router()

router.use(authenticate)

router.get('/', getEvents)
router.post('/', validate(createEventSchema), createEvent)
router.get('/:id', getEvent)
router.patch('/:id', validate(updateEventSchema), updateEvent)
router.delete('/:id', deleteEvent)

export default router
