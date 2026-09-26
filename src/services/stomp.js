import { Client } from '@stomp/stompjs'

const BASE = import.meta.env.VITE_STOMP_BASE || 'http://localhost:8080'
const WS_URL = BASE.replace(/^http/, 'ws') + '/ws-blueprints'

let client = null
let subscription = null

function getClient() {
  if (!client) {
    client = new Client({ brokerURL: WS_URL, reconnectDelay: 5000 })
  }
  return client
}

export function joinRoom(author, name, onUpdate) {
  const c = getClient()
  const topic = `/topic/blueprints.${author}.${name}`

  const subscribe = () => {
    if (subscription) subscription.unsubscribe()
    subscription = c.subscribe(topic, (msg) => {
      try {
        onUpdate(JSON.parse(msg.body))
      } catch {
        /* payload inválido */
      }
    })
  }

  if (c.connected) {
    subscribe()
  } else {
    c.onConnect = subscribe
    c.activate()
  }
}

export function sendPoint(author, name, point) {
  const c = getClient()
  if (!c.connected) return
  c.publish({
    destination: '/app/draw',
    body: JSON.stringify({ author, name, point }),
  })
}

export function leaveRoom() {
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }
  if (client) {
    client.deactivate()
    client = null
  }
}
