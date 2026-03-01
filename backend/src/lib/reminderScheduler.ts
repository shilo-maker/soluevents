import cron, { type ScheduledTask } from 'node-cron'
import fs from 'fs/promises'
import path from 'path'
import prisma from './prisma'
import { notify } from './notify'

const TASK_WINDOWS = [
  { key: 'task_24h', hoursBeforeDeadline: 24 },
  { key: 'task_1h', hoursBeforeDeadline: 1 },
]

const EVENT_WINDOWS = [
  { key: 'event_24h', hoursBeforeStart: 24 },
  { key: 'event_2h', hoursBeforeStart: 2 },
]

/** Batch-fetch already-sent markers. Returns a Set of "entityId:userId" keys. */
async function getSentSet(entityType: string, reminderKey: string, entityIds: string[]): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set()
  const rows = await prisma.sentReminder.findMany({
    where: { entity_type: entityType, reminder_key: reminderKey, entity_id: { in: entityIds } },
    select: { entity_id: true, user_id: true },
  })
  return new Set(rows.map(r => `${r.entity_id}:${r.user_id}`))
}

/** Batch-insert sent markers, ignoring duplicates from race conditions. */
async function recordSentBatch(rows: { entity_type: string; entity_id: string; user_id: string; reminder_key: string }[]): Promise<void> {
  if (rows.length === 0) return
  await prisma.sentReminder.createMany({ data: rows, skipDuplicates: true })
}

async function processTaskReminders(): Promise<void> {
  const now = new Date()

  for (const { key, hoursBeforeDeadline } of TASK_WINDOWS) {
    const windowEnd = new Date(now.getTime() + hoursBeforeDeadline * 60 * 60 * 1000)

    const tasks = await prisma.task.findMany({
      where: {
        due_at: { gt: now, lte: windowEnd },
        status: { not: 'done' },
        assignee_is_user: true,
        assignee_id: { not: null },
      },
      select: { id: true, title: true, due_at: true, assignee_id: true, event_id: true },
    })

    if (tasks.length === 0) continue

    // 1 query instead of N
    const sentSet = await getSentSet('task', key, tasks.map(t => t.id))

    const toSend = tasks.filter(t => t.assignee_id && !sentSet.has(`${t.id}:${t.assignee_id}`))

    // Send in parallel
    const sentRows: { entity_type: string; entity_id: string; user_id: string; reminder_key: string }[] = []

    await Promise.allSettled(
      toSend.map(async (task) => {
        try {
          await notify(task.assignee_id!, 'task_deadline_reminder', {
            task_id: task.id,
            task_title: task.title,
            event_id: task.event_id,
            reminder_key: key,
          })
          sentRows.push({ entity_type: 'task', entity_id: task.id, user_id: task.assignee_id!, reminder_key: key })
        } catch (err) {
          console.error(`Failed to send task reminder ${key} for task ${task.id} to user ${task.assignee_id}:`, err)
        }
      })
    )

    // 1 query instead of N
    await recordSentBatch(sentRows)
  }
}

async function processEventReminders(): Promise<void> {
  const now = new Date()

  for (const { key, hoursBeforeStart } of EVENT_WINDOWS) {
    const windowEnd = new Date(now.getTime() + hoursBeforeStart * 60 * 60 * 1000)

    const events = await prisma.event.findMany({
      where: {
        date_start: { gt: now, lte: windowEnd },
        status: { notIn: ['canceled', 'archived'] },
      },
      select: {
        id: true,
        title: true,
        date_start: true,
        event_teams: true,
        role_assignments: { select: { user_id: true } },
      },
    })

    if (events.length === 0) continue

    // 1 query instead of N*M
    const sentSet = await getSentSet('event', key, events.map(e => e.id))

    // Collect all unsent (event, user) pairs
    const toSend: { eventId: string; eventTitle: string; userId: string }[] = []

    for (const event of events) {
      const userIds = new Set<string>()

      for (const ra of event.role_assignments) {
        userIds.add(ra.user_id)
      }

      if (event.event_teams && Array.isArray(event.event_teams)) {
        for (const team of event.event_teams as any[]) {
          if (team.members && Array.isArray(team.members)) {
            for (const member of team.members) {
              if (member.is_user && member.contact_id) {
                userIds.add(member.contact_id)
              }
            }
          }
        }
      }

      for (const userId of userIds) {
        if (!sentSet.has(`${event.id}:${userId}`)) {
          toSend.push({ eventId: event.id, eventTitle: event.title, userId })
        }
      }
    }

    // Send in parallel
    const sentRows: { entity_type: string; entity_id: string; user_id: string; reminder_key: string }[] = []

    await Promise.allSettled(
      toSend.map(async ({ eventId, eventTitle, userId }) => {
        try {
          await notify(userId, 'event_reminder', {
            event_id: eventId,
            event_title: eventTitle,
            reminder_key: key,
          })
          sentRows.push({ entity_type: 'event', entity_id: eventId, user_id: userId, reminder_key: key })
        } catch (err) {
          console.error(`Failed to send event reminder ${key} for event ${eventId} to user ${userId}:`, err)
        }
      })
    )

    await recordSentBatch(sentRows)
  }
}

async function purgeOldReminders(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.sentReminder.deleteMany({
    where: { sent_at: { lt: sevenDaysAgo } },
  })
}

async function purgeExpiredFiles(): Promise<void> {
  const now = new Date()
  const uploadsRoot = path.resolve(__dirname, '../../uploads')

  // Find uploaded files whose event or tour has ended and haven't been expired yet
  const files = await prisma.soluplanFile.findMany({
    where: {
      file_type: 'upload',
      expired_at: null,
      OR: [
        { event: { date_end: { lt: now } } },
        { tour: { end_date: { lt: now } } },
      ],
    },
    select: { id: true, url: true },
  })

  // Delete all files from disk in parallel (with path traversal guard)
  await Promise.allSettled(
    files.map(async (file) => {
      const cleaned = file.url.replace(/^\/+/, '')
      const filePath = path.resolve(__dirname, '../..', cleaned)
      if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) return
      try { await fs.unlink(filePath) } catch { /* already gone */ }
    })
  )

  // Batch-update all expired files at once
  if (files.length > 0) {
    await prisma.soluplanFile.updateMany({
      where: { id: { in: files.map(f => f.id) } },
      data: { expired_at: now },
    })
    console.log(`Purged ${files.length} expired file(s)`)
  }
}

async function runReminders(): Promise<void> {
  try {
    await processTaskReminders()
    await processEventReminders()
    await purgeOldReminders()
    await purgeExpiredFiles()
  } catch (err) {
    console.error('Reminder scheduler error:', err)
  }
}

let cronTask: ScheduledTask | null = null

export function startReminderScheduler(): void {
  cronTask = cron.schedule('*/15 * * * *', runReminders)
  console.log('Reminder scheduler started (every 15 min)')
  setTimeout(runReminders, 5000)
}

export function stopReminderScheduler(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
  }
}
