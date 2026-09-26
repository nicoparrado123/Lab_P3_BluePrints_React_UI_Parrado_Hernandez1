import { useEffect, useState } from 'react'
import BlueprintCanvas from './BlueprintCanvas.jsx'

/**
 * Muestra un blueprint en el lienzo y permite editarlo (click = nuevo punto),
 * guardarlo (PUT) o eliminarlo (DELETE). Las acciones reales llegan por props.
 */
export default function BlueprintEditor({ blueprint, canWrite = true, onSave, onDelete, onRtPoint, busy }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const key = blueprint ? `${blueprint.author}/${blueprint.name}` : 'none'

  // Al cambiar de plano se descarta cualquier edición en curso.
  useEffect(() => {
    setEditing(false)
    setDraft([])
    setConfirmDelete(false)
  }, [key])

  const startEdit = () => {
    setDraft(blueprint?.points ?? [])
    setEditing(true)
    setConfirmDelete(false)
  }

  const save = () => {
    onSave?.(draft)
    setEditing(false)
  }

  const points = editing ? draft : blueprint?.points || []
  const disabled = !blueprint || !canWrite || busy

  return (
    <div className="editor">
      <div className="toolbar">
        {!editing && !confirmDelete && (
          <>
            <button type="button" className="btn" onClick={startEdit} disabled={disabled}>
              Editar
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => setConfirmDelete(true)}
              disabled={disabled}
            >
              Eliminar
            </button>
          </>
        )}
        {confirmDelete && (
          <>
            <span className="muted">¿Eliminar «{blueprint?.name}»?</span>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                setConfirmDelete(false)
                onDelete?.()
              }}
            >
              Sí, eliminar
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              No
            </button>
          </>
        )}
        {editing && (
          <>
            <button type="button" className="btn primary" onClick={save}>
              Guardar
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setDraft((d) => d.slice(0, -1))}
              disabled={!draft.length}
            >
              Deshacer punto
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setDraft([])}
              disabled={!draft.length}
            >
              Limpiar
            </button>
            <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </>
        )}
      </div>
      {blueprint && !canWrite && (
        <p className="muted small">Tu usuario solo tiene permiso de lectura (blueprints.read).</p>
      )}

      <BlueprintCanvas
        points={points}
        viewKey={key}
        onAddPoint={
          editing
            ? (p) => {
                setDraft((d) => [...d, p])
                onRtPoint?.(p)
              }
            : undefined
        }
      />
      {editing && (
        <p className="muted small">
          Haz click en el lienzo para agregar puntos · {draft.length} puntos en el borrador
        </p>
      )}
    </div>
  )
}
