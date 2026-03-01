import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { createTaskSchema, updateTaskSchema, createCommentSchema } from '../validators/schemas'
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  respondToTaskAssignment,
} from '../controllers/taskController'
import {
  getComments,
  addComment,
  deleteComment,
} from '../controllers/commentController'

const router = Router()

router.use(authenticate)

router.get('/', getTasks)
router.post('/', validate(createTaskSchema), createTask)
router.get('/:id', getTask)
router.patch('/:id', validate(updateTaskSchema), updateTask)
router.post('/:id/respond', respondToTaskAssignment)
router.delete('/:id', deleteTask)

// Nested comment routes
router.get('/:taskId/comments', getComments)
router.post('/:taskId/comments', validate(createCommentSchema), addComment)
router.delete('/:taskId/comments/:commentId', deleteComment)

export default router
