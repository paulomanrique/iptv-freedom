import { useState, useMemo } from 'react'
import { groupFavorites } from '../favorites'
import { Poster, MoviePreview, LivePreview, SeriesPreview } from './Previews'

export default function FavoritesView({ account, favorites, onPlay, onDownload, fav }) {
  const groups = useMemo(() => groupFavorites(favorites), [favorites])
  const [groupKind, setGroupKind] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  // Grupo ativo (default: o primeiro disponível)
  const activeGroup = groups.find((g) => g.kind === groupKind) || groups[0]
  const items = useMemo(
    () => [...(activeGroup?.items || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base', numeric: true })),
    [activeGroup]
  )
  const selected = items.find((i) => String(i.id) === String(selectedId)) || items[0]
  const seedOf = (i) => (items.indexOf(i) + 1) * 3
  // Grade para filmes/séries, lista para canais ao vivo
  const useGrid = activeGroup ? activeGroup.kind !== 'live' : false

  const playItem = (m) => {
    if (m.kind === 'live') onPlay({ type: 'live', id: m.id, name: m.name, live: true })
    else if (m.kind === 'vod') onPlay({ type: 'movie', id: m.id, ext: m.ext, name: m.name })
  }

  if (favorites.length === 0) {
    return (
      <section className="flex-1 grid place-items-center text-2xs text-white/45 text-center px-8">
        Nenhum favorito ainda.<br />Use a estrela ⭐ na prévia de um filme, canal ou série para favoritar.
      </section>
    )
  }

  return (
    <>
      {/* Coluna 1: grupos (Ao vivo / Filmes / Séries) */}
      <div className="w-56 shrink-0 bar border-r border-white/10 flex flex-col">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/35 border-b border-white/10">Favoritos</div>
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
                <span className="text-[10px] text-white/35">{g.items.length}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Coluna 2: itens favoritados do grupo */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-2 text-2xs text-white/50 border-b border-white/10 truncate shrink-0">
          {activeGroup?.label}
          <span className="text-white/30"> · {items.length}</span>
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
                  <Poster icon={m.icon} seed={seedOf(m)} className={m.kind === 'live' ? 'h-8 w-8' : 'h-9 w-6'} />
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{m.name}</div></div>
                  {m.kind === 'live' && <span className="text-[10px] text-red-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>}
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
