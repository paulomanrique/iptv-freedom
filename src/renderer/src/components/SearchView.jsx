import { useEffect, useState, useMemo } from 'react'
import { getStreams, normalize } from '../catalog'
import { normalizeSearch } from '../format'
import { Poster, MoviePreview, LivePreview, SeriesPreview } from './Previews'

const KINDS = [
  { kind: 'vod', label: 'Filmes' },
  { kind: 'series', label: 'Séries' },
  { kind: 'live', label: 'Ao vivo' }
]
const MAX_PER_GROUP = 300

export default function SearchView({ account, query, onPlay, onDownload, fav }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupKind, setGroupKind] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setGroupKind(null)
    setSelectedId(null)
    const q = normalizeSearch(query)

    Promise.all(
      KINDS.map(({ kind, label }) =>
        getStreams(account, kind, null)
          .then((list) =>
            (list || [])
              .map((x) => normalize(x, kind))
              .filter((i) => normalizeSearch(i.name).includes(q))
          )
          .then((items) => {
            items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base', numeric: true }))
            return { kind, label, items: items.slice(0, MAX_PER_GROUP), total: items.length }
          })
          .catch(() => ({ kind, label, items: [], total: 0 }))
      )
    ).then((res) => {
      if (!alive) return
      setGroups(res.filter((g) => g.items.length > 0))
      setLoading(false)
    })

    return () => { alive = false }
  }, [account.id, query])

  const activeGroup = groups.find((g) => g.kind === groupKind) || groups[0]
  const items = activeGroup?.items || []
  const selected = items.find((i) => String(i.id) === String(selectedId)) || items[0]
  const seedOf = (i) => (items.indexOf(i) + 1) * 3
  const useGrid = activeGroup ? activeGroup.kind !== 'live' : false
  const totalResults = groups.reduce((n, g) => n + g.total, 0)

  const playItem = (m) => {
    if (m.kind === 'live') onPlay({ type: 'live', id: m.id, name: m.name, live: true })
    else if (m.kind === 'vod') onPlay({ type: 'movie', id: m.id, ext: m.ext, name: m.name })
  }

  if (loading) {
    return (
      <section className="flex-1 grid place-items-center text-2xs text-white/45">
        <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Buscando “{query}”…</div>
      </section>
    )
  }

  if (groups.length === 0) {
    return (
      <section className="flex-1 grid place-items-center text-2xs text-white/45 text-center px-8">
        Nenhum resultado para <b className="text-white/70 mx-1">“{query}”</b>.
      </section>
    )
  }

  return (
    <>
      {/* Coluna 1: tipos de resultado */}
      <div className="w-56 shrink-0 bar border-r border-white/10 flex flex-col">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/35 border-b border-white/10 truncate">
          Resultados · “{query}”
        </div>
        <div className="flex-1 scroll overflow-y-auto py-1">
          {groups.map((g) => {
            const active = g.kind === activeGroup?.kind
            return (
              <button
                key={g.kind}
                onClick={() => { setGroupKind(g.kind); setSelectedId(null) }}
                className={`w-full text-left px-3 py-1.5 text-2xs flex items-center justify-between gap-2 transition ${active ? 'bg-accent/25 text-white' : 'text-white/70 hover:bg-white/5'}`}
              >
                <span className="truncate">{g.label}</span>
                <span className="text-[10px] text-white/35">{g.total > g.items.length ? `${g.items.length}+` : g.items.length}</span>
              </button>
            )
          })}
          <div className="px-3 pt-2 text-[10px] text-white/30">{totalResults} no total</div>
        </div>
      </div>

      {/* Coluna 2: itens do tipo selecionado */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-2 text-2xs text-white/50 border-b border-white/10 truncate shrink-0">
          {activeGroup?.label}<span className="text-white/30"> · {items.length}</span>
        </div>
        <div className="flex-1 scroll overflow-y-auto">
          {useGrid ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
              {items.map((m) => (
                <div key={`${m.kind}:${m.id}`} className={`cursor-pointer rounded-lg p-1 ${String(m.id) === String(selected?.id) ? 'bg-accent/20' : 'hover:bg-white/5'}`} onClick={() => setSelectedId(m.id)} onDoubleClick={() => playItem(m)}>
                  <Poster icon={m.icon} seed={seedOf(m)} className="aspect-[2/3] w-full" />
                  <div className="text-2xs font-medium truncate mt-1 px-0.5">{m.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((m) => (
                <div key={`${m.kind}:${m.id}`} className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${String(m.id) === String(selected?.id) ? 'bg-accent/20' : 'hover:bg-white/5'}`} onClick={() => setSelectedId(m.id)} onDoubleClick={() => playItem(m)}>
                  <Poster icon={m.icon} seed={seedOf(m)} className="h-8 w-8" />
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{m.name}</div></div>
                  <span className="text-[10px] text-red-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coluna 3: prévia */}
      <aside className="w-80 shrink-0 bar border-l border-white/10 scroll overflow-y-auto">
        {selected ? (
          selected.kind === 'live' ? (
            <LivePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} fav={fav} />
          ) : selected.kind === 'series' ? (
            <SeriesPreview account={account} item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} fav={fav} />
          ) : (
            <MoviePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} fav={fav} />
          )
        ) : (
          <div className="p-5 text-2xs text-white/45">Selecione um item.</div>
        )}
      </aside>
    </>
  )
}
