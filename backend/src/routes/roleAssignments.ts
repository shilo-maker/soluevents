import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createRoleAssignmentSchema } from '../validators/schemas'
import {
  getRoleAssignments,
  createRoleAssignment,
  deleteRoleAssignment,
} from '../controllers/roleAssignmentsController'

const router = Router()

router.use(authenticate)

router.get('/', getRoleAssignments)
router.post('/', validate(createRoleAssignmentSchema), createRoleAssignment)
router.delete('/:id', deleteRoleAssignment)

export default router
