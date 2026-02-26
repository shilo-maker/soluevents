// User types
export type OrgRole = 'admin' | 'manager' | 'member' | 'viewer'

export type EventRole =
  | 'event_manager'
  | 'worship_lead'
  | 'media_lead'
  | 'logistics'
  | 'hospitality'
  | 'comms'
  | 'contributor'
  | 'guest'

export interface User {
  id: string
  name: string
  email: string
  org_role: OrgRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  activeWorkspaceId?: string
  defaultWorkspaceId?: string
  activeWorkspace?: Workspace
}

export type WorkspaceType = 'personal' | 'organization'
export type WorkspaceMemberRole = 'admin' | 'planner' | 'leader' | 'member'

export interface Workspace {
  id: string
  name: string
  slug: string
  workspaceType: WorkspaceType
  role?: WorkspaceMemberRole
  is_active?: boolean
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  userId: string
  role: WorkspaceMemberRole
  joinedAt: string
  user: { id: string; email: string; username?: string; name?: string; avatar_url?: string }
}

export interface WorkspaceInvitation {
  id: string
  token: string
  expiresAt?: string
  usageCount: number
  maxUses?: number
  createdAt: string
  creator?: { id: string; name?: string; email: string }
}

// Event types
export type EventType = 'worship' | 'in_house' | 'film' | 'tour_child'
export type EventPhase = 'concept' | 'prep' | 'execution' | 'follow_up'
export type EventStatus = 'planned' | 'confirmed' | 'canceled' | 'archived'

export interface Event {
  id: string
  type: EventType
  title: string
  description?: string
  date_start: string
  date_end: string
  timezone: string
  location_name?: string
  address?: string
  est_attendance?: number
  phase: EventPhase
  status: EventStatus
  venue_id?: string
  parent_tour_id?: string
  tags: string[]
  flow_service_id: string | null
  program_agenda?: {
    pre_event_schedule?: Array<{
      item: string
      offset_minutes: number
      notes?: string
    }>
    program_schedule?: Array<{
      offset_minutes: number
      title: string
      type?: string
      person?: string
      person_id?: string
      person_is_user?: boolean
      key?: string
      bpm?: string
      soluflow_song_id?: string
      speaker?: string
      topic?: string
      points?: string
      prayer_leader?: string
      facilitator?: string
      has_ministry_team?: boolean
    }>
    has_post_event_schedule?: boolean
    post_event_schedule?: Array<{
      item: string
      offset_minutes: number
      notes?: string
    }>
  }
  event_teams?: Array<{
    name: string
    members: Array<{
      role: string
      contact_id: string
      is_user: boolean
      name: string
      email?: string
      phone?: string
    }>
  }>
  rider_details?: {
    worship_team?: Array<{
      role: string
      person: string
      user_id?: string
      contact_id?: string
      is_user?: boolean
      needs: string[]
      eDrums?: boolean
      eDrumsNeeds?: string[]
    }>
    has_prayer_leader?: boolean
    prayer_leader?: {
      person: string
      user_id?: string
      topic: string
      description: string
    }
    production_team?: {
      soundman: { person: string; user_id?: string; contact: string; contact_id?: string; is_user?: boolean }
      projection: { person: string; user_id?: string; contact: string; contact_id?: string; is_user?: boolean }
      host: { person: string; user_id?: string; contact: string; contact_id?: string; is_user?: boolean }
    }
    contact_person?: string
    contact_phone?: string
    soundman_needed?: boolean
    projection_needed?: boolean
    special_requirements?: string
  }
  created_by: string
  created_at: string
  updated_at: string
}

// Tour types
export interface Tour {
  id: string
  title: string
  start_date: string
  end_date: string
  regions: string[]
  director_user_id?: string
  logistics_user_id?: string
  comms_user_id?: string
  media_user_id?: string
  hospitality_user_id?: string
  created_at: string
  updated_at: string
}

export interface TourDay {
  id: string
  tour_id: string
  date: string
  city?: string
  venue_name?: string
  wake_time?: string
  drive_start_time?: string
  drive_duration_minutes?: number
  lunch_time?: string
  event_start_time?: string
  lodging_name?: string
  lodging_arrival_time?: string
  devotional_user_id?: string
  is_laundry_day: boolean
  is_shopping_day: boolean
  linked_event_id?: string
}

// Task types
export type TaskPriority = 'critical' | 'high' | 'normal'
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'blocked' | 'done'

export interface Task {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  due_at?: string
  link?: string
  event_id?: string
  tour_id?: string
  assignee_id?: string
  creator_id: string
  parent_task_id?: string
  created_at: string
  updated_at: string
}

// Role Assignment
export interface RoleAssignment {
  id: string
  event_id?: string
  tour_id?: string
  user_id: string
  role: EventRole
  scope: 'event' | 'tour' | 'tour_day'
}

// Comment
export interface Comment {
  id: string
  body: string
  author_id: string
  entity_type: 'event' | 'task' | 'tour' | 'tour_day'
  entity_id: string
  mentions: string[]
  created_at: string
  updated_at: string
}

// File
export interface File {
  id: string
  event_id?: string
  tour_id?: string
  uploader_id: string
  filename: string
  url: string
  version: number
  notes?: string
  created_at: string
}

// Template
export interface Template {
  id: string
  kind: 'event' | 'tour'
  label: string
  default_fields: any
  default_tasks: any[]
  default_agenda: any[]
  default_rider: any
  created_at: string
  updated_at: string
}

// Notification
export interface Notification {
  id: string
  user_id: string
  type: string
  payload: any
  read_at?: string
  created_at: string
}

// Contact
export interface Contact {
  id: string
  name: string
  nickname?: string
  email?: string
  phone?: string
  role?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Venue
export interface Venue {
  id: string
  name: string
  address?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Auth
export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

// SoluFlow integration types
export interface FlowServiceSong {
  id: string
  position: number
  segmentTitle?: string
  transposition?: number | null
  song: {
    id: string
    title: string
    author?: string
    musicalKey?: string
    bpm?: number
  } | null
}

export interface FlowService {
  id: string
  title: string
  code: string
  isPublic?: boolean
  workspaceId?: string
  leader?: { id: string; name: string | null } | null
  songs: FlowServiceSong[]
}
