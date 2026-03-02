import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const VALID_DOC_TYPES = ['schedule', 'teams', 'person-summary', 'tasks-report', 'rider'] as const
type DocType = (typeof VALID_DOC_TYPES)[number]

export const getDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, docType } = req.params

    if (!VALID_DOC_TYPES.includes(docType as DocType)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      })
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        date_start: true,
        date_end: true,
        timezone: true,
        location_name: true,
        address: true,
        type: true,
        status: true,
        ...(docType === 'schedule' || docType === 'person-summary'
          ? { program_agenda: true }
          : {}),
        ...(docType === 'teams' || docType === 'person-summary'
          ? { event_teams: true }
          : {}),
        ...(docType === 'person-summary' || docType === 'rider'
          ? { rider_details: true }
          : {}),
        ...(docType === 'person-summary'
          ? {
              tasks: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  due_at: true,
                  assignee_id: true,
                  assignee_contact_id: true,
                },
              },
            }
          : {}),
        ...(docType === 'tasks-report'
          ? {
              event_teams: true,
              tasks: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  status: true,
                  priority: true,
                  due_at: true,
                  assignee_id: true,
                  assignee_contact_id: true,
                  assignee_is_user: true,
                  assignment_status: true,
                  created_at: true,
                },
              },
            }
          : {}),
      },
    })

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found',
      })
    }

    res.set('Cache-Control', 'public, max-age=60')
    return res.json({ status: 'ok', data: event })
  } catch (error) {
    next(error)
  }
}
