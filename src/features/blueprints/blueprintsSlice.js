import {
  createAsyncThunk,
  createSelector,
  createSlice,
  current as snapshot,
} from '@reduxjs/toolkit'
import service from '../../services/blueprintsService.js'

export const keyOf = (author, name) => `${author}/${name}`

// ---------- Thunks ----------

export const fetchByAuthor = createAsyncThunk('blueprints/fetchByAuthor', async (author) => {
  const items = await service.getByAuthor(author)
  return { author, items }
})

export const fetchBlueprint = createAsyncThunk(
  'blueprints/fetchBlueprint',
  async ({ author, name }) => service.getByAuthorAndName(author, name),
)

export const createBlueprint = createAsyncThunk('blueprints/createBlueprint', async (payload) =>
  service.create(payload),
)

// PUT /blueprints/{author}/{name} — optimista: el reducer aplica el cambio en `pending`
// y lo revierte en `rejected`.
export const updateBlueprint = createAsyncThunk(
  'blueprints/updateBlueprint',
  async ({ author, name, points }) => service.update(author, name, { author, name, points }),
)

// DELETE /blueprints/{author}/{name} — optimista con rollback.
export const deleteBlueprint = createAsyncThunk(
  'blueprints/deleteBlueprint',
  async ({ author, name }) => {
    await service.remove(author, name)
    return { author, name }
  },
)

// ---------- Estado ----------

const initialState = {
  byAuthor: {},
  current: null,
  lastAuthorQuery: null,
  status: 'idle',
  error: null,
  blueprintStatus: 'idle',
  blueprintError: null,
  createStatus: 'idle',
  createError: null,
  updateStatus: 'idle',
  updateError: null,
  deleteStatus: 'idle',
  deleteError: null,
  // Copias del estado previo a cada cambio optimista, indexadas por "autor/nombre".
  rollback: {},
}

const isCurrent = (s, author, name) =>
  !!s.current && s.current.author === author && s.current.name === name

const indexIn = (list, name) => (list ? list.findIndex((bp) => bp.name === name) : -1)

const slice = createSlice({
  name: 'blueprints',
  initialState,
  reducers: {
    /** Agrega un punto al plano actual (broadcast RT). */
    appendPoint(s, a) {
      if (!s.current) return
      const { author, name, point } = a.payload
      if (s.current.author !== author || s.current.name !== name) return
      if (!s.current.points) s.current.points = []
      s.current.points.push(point)
    },
    clearCurrent(s) {
      s.current = null
      s.blueprintStatus = 'idle'
      s.blueprintError = null
    },
    clearMutationErrors(s) {
      s.createError = null
      s.updateError = null
      s.deleteError = null
      if (s.createStatus === 'failed') s.createStatus = 'idle'
      if (s.updateStatus === 'failed') s.updateStatus = 'idle'
      if (s.deleteStatus === 'failed') s.deleteStatus = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      // --- listar por autor ---
      .addCase(fetchByAuthor.pending, (s, a) => {
        s.status = 'loading'
        s.error = null
        s.lastAuthorQuery = a.meta.arg
      })
      .addCase(fetchByAuthor.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.byAuthor[a.payload.author] = a.payload.items
      })
      .addCase(fetchByAuthor.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.error.message
      })
      // --- abrir un plano ---
      .addCase(fetchBlueprint.pending, (s) => {
        s.blueprintStatus = 'loading'
        s.blueprintError = null
        // Al abrir otro plano ya no aplica el error de guardar/eliminar el anterior.
        slice.caseReducers.clearMutationErrors(s)
      })
      .addCase(fetchBlueprint.fulfilled, (s, a) => {
        s.blueprintStatus = 'succeeded'
        s.current = a.payload
      })
      .addCase(fetchBlueprint.rejected, (s, a) => {
        s.blueprintStatus = 'failed'
        s.blueprintError = a.error.message
      })
      // --- crear ---
      .addCase(createBlueprint.pending, (s) => {
        s.createStatus = 'loading'
        s.createError = null
      })
      .addCase(createBlueprint.fulfilled, (s, a) => {
        s.createStatus = 'succeeded'
        const bp = a.payload
        const list = s.byAuthor[bp.author]
        if (list && indexIn(list, bp.name) < 0) list.push(bp)
        s.current = bp
      })
      .addCase(createBlueprint.rejected, (s, a) => {
        s.createStatus = 'failed'
        s.createError = a.error.message
      })
      // --- actualizar (optimista) ---
      .addCase(updateBlueprint.pending, (s, a) => {
        const { author, name, points } = a.meta.arg
        const list = s.byAuthor[author]
        const i = indexIn(list, name)
        s.rollback[keyOf(author, name)] = {
          item: i >= 0 ? snapshot(list[i]) : null,
          current: isCurrent(s, author, name) ? snapshot(s.current) : null,
        }
        if (i >= 0) list[i].points = points
        if (isCurrent(s, author, name)) s.current.points = points
        s.updateStatus = 'loading'
        s.updateError = null
      })
      .addCase(updateBlueprint.fulfilled, (s, a) => {
        const { author, name } = a.meta.arg
        delete s.rollback[keyOf(author, name)]
        s.updateStatus = 'succeeded'
        const saved = a.payload
        if (saved?.points) {
          const list = s.byAuthor[author]
          const i = indexIn(list, name)
          if (i >= 0) list[i].points = saved.points
          if (isCurrent(s, author, name)) s.current.points = saved.points
        }
      })
      .addCase(updateBlueprint.rejected, (s, a) => {
        const { author, name } = a.meta.arg
        const key = keyOf(author, name)
        const prev = s.rollback[key]
        if (prev) {
          const list = s.byAuthor[author]
          const i = indexIn(list, name)
          if (prev.item && i >= 0) list[i] = prev.item
          if (prev.current && isCurrent(s, author, name)) s.current = prev.current
          delete s.rollback[key]
        }
        s.updateStatus = 'failed'
        s.updateError = a.error.message
      })
      // --- eliminar (optimista) ---
      .addCase(deleteBlueprint.pending, (s, a) => {
        const { author, name } = a.meta.arg
        const list = s.byAuthor[author]
        const i = indexIn(list, name)
        s.rollback[keyOf(author, name)] = {
          item: i >= 0 ? snapshot(list[i]) : null,
          index: i,
          current: isCurrent(s, author, name) ? snapshot(s.current) : null,
        }
        if (i >= 0) list.splice(i, 1)
        if (isCurrent(s, author, name)) s.current = null
        s.deleteStatus = 'loading'
        s.deleteError = null
      })
      .addCase(deleteBlueprint.fulfilled, (s, a) => {
        const { author, name } = a.meta.arg
        delete s.rollback[keyOf(author, name)]
        s.deleteStatus = 'succeeded'
      })
      .addCase(deleteBlueprint.rejected, (s, a) => {
        const { author, name } = a.meta.arg
        const key = keyOf(author, name)
        const prev = s.rollback[key]
        if (prev) {
          const list = s.byAuthor[author]
          if (prev.item && list && indexIn(list, name) < 0) {
            list.splice(Math.min(prev.index, list.length), 0, prev.item)
          }
          if (prev.current && !s.current) s.current = prev.current
          delete s.rollback[key]
        }
        s.deleteStatus = 'failed'
        s.deleteError = a.error.message
      })
  },
})

export const { appendPoint, clearCurrent, clearMutationErrors } = slice.actions

// ---------- Selectores ----------

const selectByAuthor = (state) => state.blueprints.byAuthor

/** Top-5 de blueprints (de todos los autores consultados) por cantidad de puntos. */
export const selectTopBlueprints = createSelector([selectByAuthor], (byAuthor) =>
  Object.values(byAuthor)
    .flat()
    .slice()
    .sort((a, b) => (b.points?.length || 0) - (a.points?.length || 0))
    .slice(0, 5),
)

export default slice.reducer
