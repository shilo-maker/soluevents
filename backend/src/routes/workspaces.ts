import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import {
  listWorkspaces,
  createWorkspace,
  switchWorkspace,
  generateInvite,
  acceptInvite,
  getWorkspaceDetails,
  updateWorkspaceHandler,
  deleteWorkspaceHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
  listInvitationsHandler,
  revokeInvitationHandler,
  searchUserByEmail,
  sendMemberInvite,
  listMemberInvites,
  revokeMemberInvite,
  getMemberInviteByToken,
  respondToMemberInvite,
} from '../controllers/workspaceController'

const router = Router()

router.use(authenticate)

// UUID validation for :id param
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
router.param('id', (_req, _res, next, id) => {
  if (!UUID_RE.test(id)) {
    return next(new AppError('Invalid workspace ID', 400))
  }
  next()
})

// Rate limiting on invite endpoints
const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/', listWorkspaces)
router.post('/', createWorkspace)

// Token-based routes BEFORE /:id routes to prevent matching as :id
router.post('/join/:token', inviteLimiter, acceptInvite)
router.get('/member-invite/:token', getMemberInviteByToken)
router.post('/member-invite/:token/respond', inviteLimiter, respondToMemberInvite)

router.patch('/:id/switch', switchWorkspace)
router.post('/:id/invite', inviteLimiter, generateInvite)

// UUID validation for :userId and :inviteId params
router.param('userId', (_req, _res, next, userId) => {
  if (!UUID_RE.test(userId)) {
    return next(new AppError('Invalid user ID', 400))
  }
  next()
})
router.param('inviteId', (_req, _res, next, inviteId) => {
  if (!UUID_RE.test(inviteId)) {
    return next(new AppError('Invalid invitation ID', 400))
  }
  next()
})

// Workspace settings routes
router.get('/:id', getWorkspaceDetails)
router.patch('/:id', updateWorkspaceHandler)
router.delete('/:id', deleteWorkspaceHandler)
router.patch('/:id/members/:userId', updateMemberRoleHandler)
router.delete('/:id/members/:userId', removeMemberHandler)
router.get('/:id/invitations', listInvitationsHandler)
router.delete('/:id/invitations/:inviteId', revokeInvitationHandler)

// Direct member invite routes
router.get('/:id/search-user', searchUserByEmail)
router.post('/:id/member-invites', inviteLimiter, sendMemberInvite)
router.get('/:id/member-invites', listMemberInvites)
router.delete('/:id/member-invites/:inviteId', revokeMemberInvite)

export default router
