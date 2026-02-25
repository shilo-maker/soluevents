import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createContactSchema, updateContactSchema } from '../validators/schemas'
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController'

const router = Router()

router.use(authenticate)

router.get('/', getContacts)
router.post('/', validate(createContactSchema), createContact)
router.get('/:id', getContact)
router.patch('/:id', validate(updateContactSchema), updateContact)
router.delete('/:id', deleteContact)

export default router
