import { useState, useEffect, useMemo, useCallback } from 'react'
import { playersApi } from '@/api/players'
import { divisionsApi, type CreateDivisionPayload, type ImportedDivision } from '@/api/divisions'
import { mainApi } from '@/api/main'
import { PlayerShort, Edition } from '@/types'

import { Search, X, Save, ArrowDownUp, Download, Plus, Minus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format, addWeeks } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DivisionDraft {
  localId: string
  name: string
  rating: number | null
  players: PlayerShort[]
  savedId: number | null
  saving: boolean
  savedAt: string | null
  error: string | null
}

// ─── Helper: format date dd/mm/yyyy ──────────────────────────────────────────

function formatDateInput(date: Date | null): string {
  if (!date) return ''
  return format(date, 'dd/MM/yyyy')
}

function parseDateInput(val: string): Date | null {
  const parts = val.split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts.map(Number)
  if (!d || !m || !y) return null
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

function toISODate(date: Date | null): string | null {
  if (!date) return null
  return format(date, 'yyyy-MM-dd')
}

function toISODateTime(date: Date | null): string | null {
  if (!date) return null
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

// ─── Small player search per division ────────────────────────────────────────

function DivisionPlayerSearch({
  allPlayers,
  assignedIds,
  onAdd,
}: {
  allPlayers: PlayerShort[]
  assignedIds: Set<number>
  onAdd: (p: PlayerShort) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!q.trim()) return []
    const lower = q.toLowerCase()
    return allPlayers
      .filter((p) => !assignedIds.has(p.id!) && (p.name ?? '').toLowerCase().includes(lower))
      .slice(0, 8)
  }, [q, allPlayers, assignedIds])

  return (
    <div className="relative mt-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Adicionar jogador..."
          className="form-control"
          style={{ paddingLeft: '2rem', height: '2.2rem', fontSize: '0.85rem' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          className="absolute z-30 w-full bg-white border border-slate-300 rounded shadow-md max-h-40 overflow-y-auto"
          style={{ top: '100%' }}
        >
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAdd(p); setQ(''); setOpen(false) }}
            >
              {p.name} <span className="opacity-50 ml-1">{p.rankingPoints}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Division Card ───────────────────────────────────────────────────────────

function DivisionCard({
  draft,
  index,
  allPlayers,
  assignedIds,
  onUpdate,
  onAddPlayer,
  onRemovePlayer,
  onMovePlayer,
  totalDivisions,
  onSave,
}: {
  draft: DivisionDraft
  index: number
  allPlayers: PlayerShort[]
  assignedIds: Set<number>
  onUpdate: (localId: string, patch: Partial<DivisionDraft>) => void
  onAddPlayer: (divIndex: number, player: PlayerShort) => void
  onRemovePlayer: (divIndex: number, playerId: number) => void
  onMovePlayer: (fromDiv: number, toDiv: number, playerId: number) => void
  totalDivisions: number
  onSave: (divIndex: number) => void
}) {
  const canSave = draft.name.trim() !== '' && !draft.saving

  return (
    <div className="c-tor-box" style={{ marginBottom: '1.5rem' }}>
      <div className="c-teams__header c-teams__header--played" style={{ padding: '0.8rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>
            {index + 1}ª Divisão
          </span>
          {draft.rating != null && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              Rating: {draft.rating}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
            {draft.players.length}/8
          </span>
          {draft.savedAt && (
            <span style={{ 
              background: 'rgba(255,255,255,0.25)', 
              borderRadius: '4px', 
              padding: '2px 8px', 
              fontSize: '0.75rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Check className="w-3 h-3" /> Guardado
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Name override */}
        <div style={{ marginBottom: '0.8rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome</label>
          <input
            type="text"
            className="form-control"
            value={draft.name}
            onChange={(e) => onUpdate(draft.localId, { name: e.target.value })}
            style={{ height: '2.2rem', fontSize: '0.9rem' }}
          />
        </div>

        {/* Players list */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Jogadores ({draft.players.length}/8)
          </label>
          <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
            {draft.players.map((p, pi) => (
              <div
                key={p.id}
                className="player_classification_row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid #eee',
                }}
              >
                <span style={{ width: '1.5rem', fontWeight: 600, textAlign: 'center' }}>{pi + 1}</span>
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>{p.rankingPoints}</span>
                {/* Move buttons */}
                {index > 0 && (
                  <button
                    type="button"
                    title={`Mover para ${index}ª Divisão`}
                    onClick={() => onMovePlayer(index, index - 1, p.id!)}
                    style={{ cursor: 'pointer', fontSize: '0.7rem', padding: '2px 4px', border: '1px solid #ccc', borderRadius: '3px' }}
                  >
                    ▲
                  </button>
                )}
                {index < totalDivisions - 1 && (
                  <button
                    type="button"
                    title={`Mover para ${index + 2}ª Divisão`}
                    onClick={() => onMovePlayer(index, index + 1, p.id!)}
                    style={{ cursor: 'pointer', fontSize: '0.7rem', padding: '2px 4px', border: '1px solid #ccc', borderRadius: '3px' }}
                  >
                    ▼
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemovePlayer(index, p.id!)}
                  style={{ cursor: 'pointer', opacity: 0.5 }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {draft.players.length < 8 && (
            <DivisionPlayerSearch
              allPlayers={allPlayers}
              assignedIds={assignedIds}
              onAdd={(p) => onAddPlayer(index, p)}
            />
          )}
        </div>

        {draft.error && (
          <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {draft.error}
          </div>
        )}

        {/* Save */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button
            size="sm"
            onClick={() => onSave(index)}
            disabled={!canSave}
            className="c-btn-create"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {draft.savedId ? 'Atualizar divisão' : 'Guardar divisão'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CreateDivisionsPage() {
  

  // Global state
  const [editions, setEditions] = useState<{ id: number; name: string }[]>([])
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null)
  const [numDivisions, setNumDivisions] = useState(5)
  const [baseName, setBaseName] = useState('')
  const [baseRating, setBaseRating] = useState(2000)
  const [startDateStr, setStartDateStr] = useState('')
  const [divisions, setDivisions] = useState<DivisionDraft[]>([])
  const [preImportSnapshot, setPreImportSnapshot] = useState<DivisionDraft[] | null>(null)

  // All players for search
  const [allPlayers, setAllPlayers] = useState<PlayerShort[]>([])
  const [playersLoading, setPlayersLoading] = useState(true)

  // Load editions from index data
  useEffect(() => {
    mainApi.index().then(({ data }) => {
      if (data.lastEdition) {
        // Collect unique editions from tournaments
        const editionMap = new Map<number, string>()
        if (data.lastEdition) {
          editionMap.set(data.lastEdition.id, data.lastEdition.fullName || data.lastEdition.name)
        }
        setEditions(Array.from(editionMap.entries()).map(([id, name]) => ({ id, name })))
        if (!selectedEditionId && data.lastEdition) {
          setSelectedEditionId(data.lastEdition.id)
        }
      }
    })
  }, [])

  // Load all players
  useEffect(() => {
    setPlayersLoading(true)
    playersApi.players_short()
      .then(({ data }) => {
        const arr = Array.isArray(data) ? data : Object.values(data)
        const normalized = (arr as any[])
          .map((v: any) => {
            const p = v?.player ?? v
            if (!p || typeof p.id !== 'number') return null
            return {
              id: p.id,
              name: p.name || p.fullName || p.full_name || '',
              fullName: p.fullName || p.name || '',
              pictureUrl: p.pictureUrl || null,
              rankingPoints: p.rankingPoints ?? 0,
            } as PlayerShort
          })
          .filter(Boolean) as PlayerShort[]
        setAllPlayers(normalized)
      })
      .finally(() => setPlayersLoading(false))
  }, [])

  // Derived: all assigned player IDs across divisions
  const assignedIds = useMemo(() => {
    const set = new Set<number>()
    divisions.forEach((d) => d.players.forEach((p) => { if (p.id != null) set.add(p.id) }))
    return set
  }, [divisions])

  // Computed dates
  const startDate = useMemo(() => parseDateInput(startDateStr), [startDateStr])
  const endDate = useMemo(() => (startDate ? addWeeks(startDate, 7) : null), [startDate])

  const savedCount = divisions.filter((d) => d.savedId !== null).length

  // ── Generate divisions ──────────────────────────────────────────────────────

  function generateDivisions() {
    const drafts: DivisionDraft[] = []
    for (let i = 0; i < numDivisions; i++) {
      const rating = Math.round(baseRating / Math.pow(2, i))
      const name = baseName
        ? `${baseName} - ${i + 1}ª Divisão`
        : `${i + 1}ª Divisão`
      drafts.push({
        localId: `div-${Date.now()}-${i}`,
        name,
        rating,
        players: [],
        savedId: null,
        saving: false,
        savedAt: null,
        error: null,
      })
    }
    setDivisions(drafts)
    setPreImportSnapshot(null)
  }

  // ── Import players from last edition ────────────────────────────────────────

  async function handleImport() {
    if (!selectedEditionId || divisions.length === 0) return
    setPreImportSnapshot([...divisions.map((d) => ({ ...d, players: [...d.players] }))])

    try {
      const { data } = await divisionsApi.fetchLastPlayedPlayers(selectedEditionId)
      const imported = data.divisions

      setDivisions((prev) => {
        const next = prev.map((d) => ({ ...d, players: [...d.players] }))
        imported.forEach((impDiv, i) => {
          if (i < next.length) {
            next[i].players = impDiv.players.map((p, idx) => ({
              id: p.id,
              name: p.name,
              fullName: p.name,
              pictureUrl: p.pictureUrl ?? null,
              rankingPoints: 0,
            }))
          }
        })
        return next
      })
    } catch (err) {
      console.error('Import failed', err)
    }
  }

  function handleUndoImport() {
    if (preImportSnapshot) {
      setDivisions(preImportSnapshot)
      setPreImportSnapshot(null)
    }
  }

  // ── Relegations ─────────────────────────────────────────────────────────────

  function handleRelegations() {
    setDivisions((prev) => {
      const next = prev.map((d) => ({ ...d, players: [...d.players] }))
      const goingDown: PlayerShort[][] = [] // goingDown[i] = players going from div i to div i+1
      const goingUp: PlayerShort[][] = []   // goingUp[i] = players going from div i to div i-1

      // Collect who relegates/promotes
      for (let i = 0; i < next.length; i++) {
        // Bottom 2 go down (except last division)
        if (i < next.length - 1 && next[i].players.length >= 2) {
          goingDown[i] = next[i].players.slice(-2)
        } else {
          goingDown[i] = []
        }
        // Top 2 go up (except first division)
        if (i > 0 && next[i].players.length >= 2) {
          goingUp[i] = next[i].players.slice(0, 2)
        } else {
          goingUp[i] = []
        }
      }

      // Remove them from source
      for (let i = 0; i < next.length; i++) {
        const removeIds = new Set([
          ...goingDown[i].map((p) => p.id),
          ...goingUp[i].map((p) => p.id),
        ])
        next[i].players = next[i].players.filter((p) => !removeIds.has(p.id))
      }

      // Add to target
      for (let i = 0; i < next.length; i++) {
        if (goingDown[i].length > 0 && i + 1 < next.length) {
          next[i + 1].players = [...goingDown[i], ...next[i + 1].players]
        }
        if (goingUp[i].length > 0 && i - 1 >= 0) {
          next[i - 1].players = [...next[i - 1].players, ...goingUp[i]]
        }
      }

      return next
    })
  }

  // ── Division CRUD ───────────────────────────────────────────────────────────

  function updateDraft(localId: string, patch: Partial<DivisionDraft>) {
    setDivisions((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, ...patch } : d))
    )
  }

  function addPlayerToDivision(divIndex: number, player: PlayerShort) {
    setDivisions((prev) => {
      const next = [...prev]
      const d = { ...next[divIndex], players: [...next[divIndex].players] }
      if (d.players.length >= 8) return prev
      if (d.players.some((p) => p.id === player.id)) return prev
      d.players.push(player)
      next[divIndex] = d
      return next
    })
  }

  function removePlayerFromDivision(divIndex: number, playerId: number) {
    setDivisions((prev) => {
      const next = [...prev]
      next[divIndex] = {
        ...next[divIndex],
        players: next[divIndex].players.filter((p) => p.id !== playerId),
      }
      return next
    })
  }

  function movePlayer(fromDiv: number, toDiv: number, playerId: number) {
    setDivisions((prev) => {
      const next = prev.map((d) => ({ ...d, players: [...d.players] }))
      const player = next[fromDiv].players.find((p) => p.id === playerId)
      if (!player) return prev
      if (next[toDiv].players.length >= 8) return prev
      next[fromDiv].players = next[fromDiv].players.filter((p) => p.id !== playerId)
      next[toDiv].players.push(player)
      return next
    })
  }

  // ── Save one division ───────────────────────────────────────────────────────

  async function saveDivision(divIndex: number) {
    const draft = divisions[divIndex]
    if (!selectedEditionId || !draft.name.trim()) return

    const payload: CreateDivisionPayload = {
      edition_id: selectedEditionId,
      name: draft.name,
      beginning_datetime: toISODateTime(startDate),
      rating: draft.rating,
      end_date: toISODate(endDate),
      has_ended: false,
      open_division: false,
      logo_image_id: null,
      large_picture_id: null,
      players: draft.players
        .filter((p) => p.id != null)
        .map((p, idx) => ({ player_id: p.id!, order_index: idx + 1 })),
    }

    updateDraft(draft.localId, { saving: true, error: null })

    try {
      if (draft.savedId) {
        await divisionsApi.update(draft.savedId, payload)
      } else {
        const res = await divisionsApi.create(payload)
        const returnedId = (res.data as any)?.id ?? null
        updateDraft(draft.localId, { savedId: returnedId })
      }
      updateDraft(draft.localId, {
        saving: false,
        savedAt: new Date().toLocaleTimeString('pt-PT'),
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao guardar'
      updateDraft(draft.localId, { saving: false, error: msg })
    }
  }


  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="c-tor-header c-tor-header--master">
        <div className="c-tor-header__content">
          <div className="c-tor-header__title">Criar Divisões</div>
          <div className="c-tor-header__iandt">
            <span>Criar divisões para uma edição</span>
          </div>
        </div>
      </div>

      <div className="l-grid">
        {/* ── Global Settings ── */}
        <div className="c-tor-box" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Configuração Geral</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Edition */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Edição</label>
              <select
                className="form-select"
                value={selectedEditionId ?? ''}
                onChange={(e) => setSelectedEditionId(Number(e.target.value) || null)}
                style={{ width: '100%' }}
              >
                <option value="">Selecionar edição</option>
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>{ed.name}</option>
                ))}
              </select>
            </div>

            {/* Number of divisions */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nº de divisões</label>
              <input
                type="number"
                className="form-control"
                min={1}
                max={10}
                value={numDivisions}
                onChange={(e) => setNumDivisions(Math.max(1, Math.min(10, Number(e.target.value))))}
              />
            </div>

            {/* Base name */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nome base</label>
              <input
                type="text"
                className="form-control"
                placeholder="ex: Outono 2026"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
              />
            </div>

            {/* Base rating */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Rating 1ª Divisão</label>
              <input
                type="number"
                className="form-control"
                min={0}
                value={baseRating}
                onChange={(e) => setBaseRating(Number(e.target.value))}
              />
            </div>

            {/* Start date */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Data início (dd/mm/aaaa)</label>
              <input
                type="text"
                className="form-control"
                placeholder="01/03/2026"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
              />
            </div>

            {/* End date (computed) */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Data fim</label>
              <input
                type="text"
                className="form-control"
                readOnly
                value={endDate ? formatDateInput(endDate) : '—'}
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Button className="c-btn-create" onClick={generateDivisions} disabled={!selectedEditionId}>
              <Plus className="w-4 h-4 mr-1" /> Gerar {numDivisions} divisões
            </Button>

            {divisions.length > 0 && (
              <>
                <Button className="c-btn-create" onClick={handleImport} disabled={!selectedEditionId}>
                  <Download className="w-4 h-4 mr-1" /> Importar jogadores
                </Button>

                {preImportSnapshot && (
                  <Button className="c-btn-create" onClick={handleUndoImport} variant="outline">
                    Anular importação
                  </Button>
                )}

                <Button className="c-btn-create" onClick={handleRelegations}>
                  <ArrowDownUp className="w-4 h-4 mr-1" /> Despromoções
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Progress ── */}
        {divisions.length > 0 && (
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            <strong>Progresso:</strong> {savedCount} / {divisions.length} guardadas
            <div style={{
              marginTop: '0.3rem',
              height: '6px',
              borderRadius: '3px',
              background: '#e2e8f0',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(savedCount / divisions.length) * 100}%`,
                height: '100%',
                background: '#22c55e',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── Division Cards ── */}
        {divisions.map((draft, i) => (
          <DivisionCard
            key={draft.localId}
            draft={draft}
            index={i}
            allPlayers={allPlayers}
            assignedIds={assignedIds}
            onUpdate={updateDraft}
            onAddPlayer={addPlayerToDivision}
            onRemovePlayer={removePlayerFromDivision}
            onMovePlayer={movePlayer}
            totalDivisions={divisions.length}
            onSave={saveDivision}
          />
        ))}

        {divisions.length === 0 && (
          <div className="c-tor-box" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
            <p>Seleciona uma edição e clica em "Gerar divisões" para começar.</p>
          </div>
        )}
      </div>
    </>
  )
}
