import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createUserSchema, updateUserSchema } from '../validators/schemas'
import { getUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController'

const router = Router()

router.use(authenticate)

router.get('/', getUsers)
router.get('/:id', getUser)
router.post('/', authorize('admin'), validate(createUserSchema), createUser)
router.patch('/:id', validate(updateUserSchema), updateUser)
router.delete('/:id', deleteUser)

export default router
