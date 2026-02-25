import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createTaskSchema, updateTaskSchema } from '../validators/schemas'
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController'

const router = Router()

router.use(authenticate)

router.get('/', getTasks)
router.post('/', validate(createTaskSchema), createTask)
router.get('/:id', getTask)
router.patch('/:id', validate(updateTaskSchema), updateTask)
router.delete('/:id', deleteTask)

export default router
