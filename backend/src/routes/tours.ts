import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createTourSchema, updateTourSchema } from '../validators/schemas'
import {
  getTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
} from '../controllers/tourController'

const router = Router()

router.use(authenticate)

router.get('/', getTours)
router.post('/', validate(createTourSchema), createTour)
router.get('/:id', getTour)
router.patch('/:id', validate(updateTourSchema), updateTour)
router.delete('/:id', deleteTour)

export default router
