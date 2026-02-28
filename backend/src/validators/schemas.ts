import { z } from 'zod'

// ── Auth ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
})

// ── Events ────────────────────────────────────────────────────────

export const createEventSchema = z.object({
  type: z.enum(['worship', 'in_house', 'film', 'tour_child']),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  date_start: z.string().min(1),
  date_end: z.string().min(1),
  timezone: z.string().max(50).optional(),
  location_name: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  est_attendance: z.number().int().min(0).optional().nullable(),
  phase: z.enum(['concept', 'prep', 'execution', 'follow_up']).optional(),
  status: z.enum(['planned', 'confirmed', 'canceled', 'archived']).optional(),
  venue_id: z.string().uuid().optional().nullable(),
  parent_tour_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
  program_agenda: z.any().optional().nullable(),
  rider_details: z.any().optional().nullable(),
  event_teams: z.any().optional().nullable(),
})

export const updateEventSchema = z.object({
  type: z.enum(['worship', 'in_house', 'film', 'tour_child']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  timezone: z.string().max(50).optional(),
  location_name: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  est_attendance: z.number().int().min(0).optional().nullable(),
  phase: z.enum(['concept', 'prep', 'execution', 'follow_up']).optional(),
  status: z.enum(['planned', 'confirmed', 'canceled', 'archived']).optional(),
  venue_id: z.string().uuid().optional().nullable(),
  parent_tour_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
  program_agenda: z.any().optional().nullable(),
  rider_details: z.any().optional().nullable(),
  event_teams: z.any().optional().nullable(),
  flow_service_id: z.string().uuid().optional().nullable(),
})

// ── Tours ─────────────────────────────────────────────────────────

export const createTourSchema = z.object({
  title: z.string().min(1).max(200),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  regions: z.array(z.string().max(100)).optional(),
  director_user_id: z.string().uuid().optional().nullable(),
  logistics_user_id: z.string().uuid().optional().nullable(),
  comms_user_id: z.string().uuid().optional().nullable(),
  media_user_id: z.string().uuid().optional().nullable(),
  hospitality_user_id: z.string().uuid().optional().nullable(),
})

export const updateTourSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  regions: z.array(z.string().max(100)).optional(),
  director_user_id: z.string().uuid().optional().nullable(),
  logistics_user_id: z.string().uuid().optional().nullable(),
  comms_user_id: z.string().uuid().optional().nullable(),
  media_user_id: z.string().uuid().optional().nullable(),
  hospitality_user_id: z.string().uuid().optional().nullable(),
})

// ── Tasks ─────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['critical', 'high', 'normal']).optional(),
  status: z.enum(['not_started', 'in_progress', 'waiting', 'blocked', 'done']).optional(),
  due_at: z.string().optional().nullable(),
  link: z.string().url().max(2000).optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  assignee_contact_id: z.string().uuid().optional().nullable(),
  assignee_is_user: z.boolean().optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(['critical', 'high', 'normal']).optional(),
  status: z.enum(['not_started', 'in_progress', 'waiting', 'blocked', 'done']).optional(),
  due_at: z.string().optional().nullable(),
  link: z.string().url().max(2000).optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  assignee_contact_id: z.string().uuid().optional().nullable(),
  assignee_is_user: z.boolean().optional(),
})

export const taskQuerySchema = z.object({
  assignee: z.string().optional(),
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  status: z.enum(['not_started', 'in_progress', 'waiting', 'blocked', 'done']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
})

// ── Comments ─────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
})

// ── Contacts ──────────────────────────────────────────────────────

export const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  nickname: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nickname: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

// ── Venues ───────────────────────────────────────────────────────

export const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().nullable(),
})

export const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional().nullable(),
})

// ── Role Assignments ──────────────────────────────────────────────

export const createRoleAssignmentSchema = z.object({
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid(),
  role: z.enum(['event_manager', 'worship_lead', 'media_lead', 'logistics', 'hospitality', 'comms', 'contributor', 'guest']),
  scope: z.enum(['event', 'tour', 'tour_day']),
}).refine(data => data.event_id || data.tour_id, {
  message: 'Either event_id or tour_id is required',
})

// ── Users ─────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  org_role: z.enum(['admin', 'manager', 'member', 'viewer']).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
  org_role: z.enum(['admin', 'manager', 'member', 'viewer']).optional(),
  is_active: z.boolean().optional(),
  avatar_url: z
    .string()
    .max(50000)
    .regex(/^data:image\/(jpeg|png|webp);base64,/, 'Must be a base64 data URL (jpeg, png, or webp)')
    .optional()
    .nullable(),
})

// ── Integration ───────────────────────────────────────────────────

export const linkEventSchema = z.object({
  flow_service_id: z.string().uuid().optional().nullable(),
  setlist_id: z.string().uuid().optional().nullable(),
  workspace_id: z.string().uuid().optional().nullable(),
})

export const createFlowServiceSchema = z.object({
  title: z.string().min(1).max(200),
  workspace_id: z.string().uuid().optional().nullable(),
  date: z.string().optional().nullable(),
  time: z.string().max(20).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  leader_id: z.string().uuid().optional().nullable(),
})

// ── Pagination helper ─────────────────────────────────────────────

export const paginationQuery = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
})
