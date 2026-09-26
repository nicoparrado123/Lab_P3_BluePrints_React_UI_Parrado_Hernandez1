import * as sio from './socketio.js'
import * as stomp from './stomp.js'

// 'none' | 'socketio' | 'stomp'
let _mode = 'none'

export function setRtMode(mode) {
  if (_mode !== 'none') {
    _mode === 'socketio' ? sio.leaveRoom() : stomp.leaveRoom()
  }
  _mode = mode
}

export function getRtMode() {
  return _mode
}

export function joinRoom(author, name, onUpdate) {
  if (_mode === 'socketio') sio.joinRoom(author, name, onUpdate)
  else if (_mode === 'stomp') stomp.joinRoom(author, name, onUpdate)
}

export function sendPoint(author, name, point) {
  if (_mode === 'socketio') sio.sendPoint(author, name, point)
  else if (_mode === 'stomp') stomp.sendPoint(author, name, point)
}

export function leaveRoom() {
  if (_mode === 'socketio') sio.leaveRoom()
  else if (_mode === 'stomp') stomp.leaveRoom()
}
