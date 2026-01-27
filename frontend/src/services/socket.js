import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket già connesso')
      return
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    this.socket.on('connect', () => {
      console.log('Socket.IO connesso:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket.IO disconnesso:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Errore connessione Socket.IO:', error.message)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO riconnesso dopo ${attemptNumber} tentativi`)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  // Join a room (monitor, tablets, kitchen)
  joinRoom(room) {
    if (!this.socket?.connected) {
      console.warn('Socket non connesso - impossibile joinare room')
      return
    }

    this.socket.emit('join', { room })
    console.log(`Joined room: ${room}`)
  }

  // Leave a room
  leaveRoom(room) {
    if (!this.socket?.connected) return

    this.socket.emit('leave', { room })
    console.log(`Left room: ${room}`)
  }

  // Subscribe to event
  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket non inizializzato')
      return
    }

    // Rimuovi listener precedente se esiste
    if (this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event))
    }

    this.socket.on(event, callback)
    this.listeners.set(event, callback)
  }

  // Unsubscribe from event
  off(event) {
    if (!this.socket) return

    const callback = this.listeners.get(event)
    if (callback) {
      this.socket.off(event, callback)
      this.listeners.delete(event)
    }
  }

  // Emit event (se necessario)
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket non connesso - impossibile emettere evento')
      return
    }

    this.socket.emit(event, data)
  }

  isConnected() {
    return this.socket?.connected || false
  }
}

export const socketService = new SocketService()
