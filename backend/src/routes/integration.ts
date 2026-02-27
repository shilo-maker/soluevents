import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createFlowServiceSchema, linkEventSchema } from '../validators/schemas'
import {
  searchSongs,
  getSong,
  getServices,
  getService,
  getServiceByCode,
  createService,
  getSetlists,
  getSetlist,
  getWorkspaces,
  linkEventToService,
  generateSolucast,
} from '../controllers/integrationController'

const router = Router()

router.use(authenticate)

// Songs
router.get('/songs', searchSongs)
router.get('/songs/:id', getSong)

// FlowServices
router.get('/services', getServices)
router.get('/services/code/:code', getServiceByCode)
router.get('/services/:id', getService)
router.post('/services', validate(createFlowServiceSchema), createService)

// Setlists
router.get('/setlists', getSetlists)
router.get('/setlists/:id', getSetlist)

// Workspaces
router.get('/workspaces', getWorkspaces)

// Link event to FlowService/Setlist
router.post('/events/:id/link-service', validate(linkEventSchema), linkEventToService)

// Generate SoluCast setlist from event schedule
router.post('/events/:id/generate-solucast', generateSolucast)

export default router
