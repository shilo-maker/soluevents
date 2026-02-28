import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import prisma from './prisma'
import { checkWorkspaceMembership } from '../services/workspaceService'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let io: SocketIOServer | null = null

export function setupSocketIO(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  })

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    // Dual-secret verification (same as auth.ts)
    let decoded: { id?: string; userId?: string }
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { id?: string; userId?: string }
    } catch {
      if (process.env.SOLUCAST_JWT_SECRET) {
        try {
          decoded = jwt.verify(token, process.env.SOLUCAST_JWT_SECRET, { algorithms: ['HS256'] }) as { id?: string; userId?: string }
        } catch {
          return next(new Error('Invalid token'))
        }
      } else {
        return next(new Error('Invalid token'))
      }
    }

    const userId = decoded.id || decoded.userId
    if (!userId) {
      return next(new Error('Invalid token payload'))
    }

    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string

    // Auto-join personal room
    socket.join(`user:${userId}`)

    // Client-driven event room management with authorization
    socket.on('join:event', async (eventId: string) => {
      if (typeof eventId !== 'string' || !UUID_RE.test(eventId)) return

      try {
        // Verify user has access to this event
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { created_by: true, workspace_id: true },
        })
        if (!event) return

        let hasAccess = event.created_by === userId
        if (!hasAccess && event.workspace_id) {
          hasAccess = await checkWorkspaceMembership(event.workspace_id, userId)
        }
        if (!hasAccess) {
          // Check if user is a team member via jsonb query
          const teamCheck = await prisma.$queryRaw<{ found: boolean }[]>`
            SELECT EXISTS(
              SELECT 1 FROM events
              WHERE id = ${eventId}::uuid
                AND event_teams IS NOT NULL
                AND jsonb_path_exists(
                  event_teams,
                  '$[*].members[*] ? (@.is_user == true && @.contact_id == $uid)',
                  jsonb_build_object('uid', ${userId}::text)
                )
            ) AS found
          `
          hasAccess = teamCheck[0]?.found === true
        }

        if (hasAccess) {
          socket.join(`event:${eventId}`)
        }
      } catch {
        // DB error — deny join silently
      }
    })

    socket.on('leave:event', (eventId: string) => {
      if (typeof eventId === 'string' && UUID_RE.test(eventId)) {
        socket.leave(`event:${eventId}`)
      }
    })
  })

  console.log('Socket.IO initialized')
  return io
}

export function getIO(): SocketIOServer | null {
  return io
}

export function closeIO(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close(() => resolve())
    } else {
      resolve()
    }
  })
}
