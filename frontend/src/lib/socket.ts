import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  return socket
}

export function connectSocket() {
  // Don't create another instance if one already exists (any state)
  if (socket) return

  socket = io({
    autoConnect: false,
    auth: (cb) => {
      const token = useAuthStore.getState().accessToken
      cb({ token })
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  // Handle auth failures on connect/reconnect
  socket.on('connect_error', (err) => {
    const msg = err.message || ''
    if (msg.includes('Authentication') || msg.includes('Invalid token') || msg.includes('token')) {
      // Token may be expired — disconnect and let useSocketConnection re-create
      // on next auth state change (e.g., after axios refresh interceptor runs)
      console.warn('Socket auth failed:', msg)
      disconnectSocket()
    }
  })

  socket.connect()
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}
