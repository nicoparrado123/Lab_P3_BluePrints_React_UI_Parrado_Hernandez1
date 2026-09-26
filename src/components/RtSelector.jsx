import { getRtMode, setRtMode } from '../services/rtService.js'

const OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'socketio', label: 'Socket.IO' },
  { value: 'stomp', label: 'STOMP' },
]

export default function RtSelector({ value, onChange }) {
  return (
    <div className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
      <span className="muted small">RT:</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`btn${value === o.value ? ' primary' : ' ghost'}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
