import { Router } from 'express'
import { authenticateApiKey, handleSoluflowSync } from '../controllers/webhookController'

const router = Router()

// All webhook routes require API key authentication
router.use(authenticateApiKey)

router.post('/soluflow-sync', handleSoluflowSync)

export default router
