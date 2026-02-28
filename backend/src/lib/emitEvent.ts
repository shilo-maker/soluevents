import { getIO } from './socket'

export function emitEventUpdate(eventId: string, event: string, payload?: Record<string, any>) {
  try {
    const io = getIO()
    if (io) {
      io.to(`event:${eventId}`).emit(event, payload || {})
    }
  } catch (err) {
    console.warn('Socket emit error (event room):', err)
  }
}

export function emitToUser(userId: string, event: string, payload?: Record<string, any>) {
  try {
    const io = getIO()
    if (io) {
      io.to(`user:${userId}`).emit(event, payload || {})
    }
  } catch (err) {
    console.warn('Socket emit error (user room):', err)
  }
}
