import { io } from 'socket.io-client'

const BASE = import.meta.env.VITE_IO_BASE || 'http://localhost:3001'

let socket = null

function getSocket() {
  if (!socket) {
    socket = io(BASE, { transports: ['websocket'], autoConnect: false })
  }
  return socket
}

export function joinRoom(author, name, onUpdate) {
  const s = getSocket()
  const room = `blueprints.${author}.${name}`
  if (!s.connected) s.connect()
  s.emit('join-room', room)
  s.off('blueprint-update')
  s.on('blueprint-update', onUpdate)
}

export function sendPoint(author, name, point) {
  const s = getSocket()
  const room = `blueprints.${author}.${name}`
  s.emit('draw-event', { room, author, name, point })
}

export function leaveRoom() {
  if (socket) {
    socket.off('blueprint-update')
    socket.disconnect()
  }
}
