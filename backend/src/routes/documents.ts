import { Router } from 'express'
import { getDocument } from '../controllers/documentController'

const router = Router()

// Public endpoints — no authenticate middleware
router.get('/events/:eventId/:docType', getDocument)

export default router
