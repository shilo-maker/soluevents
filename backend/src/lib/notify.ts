import prisma from './prisma'
import { emitToUser } from './emitEvent'
import { sendPushToUser } from './webPush'

interface PushContent {
  title: string
  body: string
  url?: string
}

function buildPushContent(type: string, payload: Record<string, any>): PushContent {
  switch (type) {
    case 'workspace_invite':
      return {
        title: 'הזמנה לסביבת עבודה',
        body: `הוזמנת לסביבת עבודה: ${payload.workspace_name || ''}`,
        url: payload.token ? `/workspace/member-invite/${payload.token}` : '/',
      }
    case 'event_team_invite':
      return {
        title: 'הזמנה לאירוע',
        body: `הוזמנת לאירוע: ${payload.event_title || ''}`,
        url: payload.event_id ? `/events/${payload.event_id}` : '/',
      }
    case 'event_team_response':
      return {
        title: 'תגובה להזמנה',
        body: `${payload.member_name || ''} ${payload.action === 'accept' ? 'אישר/ה' : 'דחה/תה'} את ההזמנה ל${payload.event_title || ''}`,
        url: payload.event_id ? `/events/${payload.event_id}` : '/',
      }
    case 'event_team_removed':
      return {
        title: 'הוסרת מאירוע',
        body: `הוסרת מהאירוע: ${payload.event_title || ''}`,
        url: '/',
      }
    case 'task_comment':
      return {
        title: 'תגובה חדשה',
        body: `${payload.commenter_name || ''} הגיב על: ${payload.task_title || ''}`,
        url: payload.event_id ? `/events/${payload.event_id}` : '/tasks',
      }
    case 'task_deadline_reminder': {
      const taskWindow = payload.reminder_key === 'task_1h' ? 'שעה' : 'יום'
      return {
        title: 'תזכורת משימה',
        body: `${payload.task_title || 'משימה'} — בעוד ${taskWindow}`,
        url: payload.event_id ? `/events/${payload.event_id}?tab=tasks` : '/tasks',
      }
    }
    case 'event_reminder': {
      const eventWindow = payload.reminder_key === 'event_2h' ? 'שעתיים' : 'יום'
      return {
        title: 'תזכורת אירוע',
        body: `${payload.event_title || 'אירוע'} — בעוד ${eventWindow}`,
        url: payload.event_id ? `/events/${payload.event_id}` : '/',
      }
    }
    default:
      return {
        title: 'SoluPlan',
        body: 'התראה חדשה',
        url: '/',
      }
  }
}

/**
 * Centralized notification helper.
 * Creates a DB notification, emits via Socket.IO, and sends a web push (fire-and-forget).
 */
export async function notify(
  userId: string,
  type: string,
  payload: Record<string, any>
): Promise<void> {
  // 1. Create DB notification
  const notification = await prisma.notification.create({
    data: { user_id: userId, type, payload },
  })

  // 2. Real-time Socket.IO
  emitToUser(userId, 'notification:new', notification)

  // 3. Web Push (fire-and-forget)
  sendPushToUser(userId, buildPushContent(type, payload)).catch(() => {})
}
