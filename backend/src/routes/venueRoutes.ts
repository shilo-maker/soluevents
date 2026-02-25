import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createVenueSchema, updateVenueSchema } from '../validators/schemas'
import {
  getVenues,
  getVenue,
  createVenue,
  updateVenue,
  deleteVenue,
} from '../controllers/venueController'

const router = Router()

router.use(authenticate)

router.get('/', getVenues)
router.post('/', validate(createVenueSchema), createVenue)
router.get('/:id', getVenue)
router.patch('/:id', validate(updateVenueSchema), updateVenue)
router.delete('/:id', deleteVenue)

export default router
