import { useEffect, useState } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import type { Account, Kind } from '@iptv/contracts'
import { getStreams, normalize, type CatalogItem } from '../catalog'
import { normalizeSearch } from '../format'
import { Poster, MoviePreview, LivePreview, SeriesPreview } from './Previews'

const KINDS: Kind[] = ['vod', 'series', 'live']
const KIND_NAV: Record<Kind, string> = { vod: 'movies', series: 'series', live: 'live' }
const MAX_PER_GROUP = 300

interface SearchGroup { kind: Kind; items: CatalogItem[]; total: number }
interface SearchViewProps { account: Account; query: string; onPlay: (item: any) => void; onDownload: (item: any) => void; fav: any }

export default function SearchView({ account, query, onPlay, onDownload, fav }: SearchViewProps) {
  const { t } = useTranslation()
  const labelFor = (kind: Kind) => t(`nav.${KIND_NAV[kind] || kind}`)
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [groupKind, setGroupKind] = useState<Kind | null>(null)
  const [selectedId, setSelectedId] = useState<string | number | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setGroupKind(null)
    setSelectedId(null)
    const q = normalizeSearch(query)

    Promise.all(
      KINDS.map((kind) =>
        getStreams(account, kind, undefined)
          .then((list) =>
            (list || [])
              .map((x) => normalize(x, kind))
              .filter((i) => normalizeSearch(i.name).includes(q))
          )
          .then((items) => {
            items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base', numeric: true }))
            return { kind, items: items.slice(0, MAX_PER_GROUP), total: items.length }
          })
          .catch(() => ({ kind, items: [], total: 0 }))
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
  const seedOf = (i: CatalogItem) => (items.indexOf(i) + 1) * 3
  const useGrid = activeGroup ? activeGroup.kind !== 'live' : false
  const totalResults = groups.reduce((n, g) => n + g.total, 0)

  const playItem = (m: CatalogItem) => {
    if (m.kind === 'live') onPlay({ type: 'live', id: m.id, name: m.name, live: true })
    else if (m.kind === 'vod') onPlay({ type: 'movie', id: m.id, ext: m.ext, name: m.name })
  }

  if (loading) {
    return (
      <section className="flex-1 grid place-items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />{t('search.searching', { query })}</div>
      </section>
    )
  }

  if (groups.length === 0) {
    return (
      <section className="flex-1 grid place-items-center text-xs text-muted-foreground text-center px-8">
        <Trans i18nKey="search.noResults" values={{ query }} components={{ b: <b className="text-muted-foreground mx-1" /> }} />
      </section>
    )
  }

  return (
    <>
      {/* Column 1: result types */}
      <div className="w-56 shrink-0  border-e border-border flex flex-col">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border truncate">
          {t('search.results', { query })}
        </div>
        <div className="flex-1 scroll overflow-y-auto py-1">
          {groups.map((g) => {
            const active = g.kind === activeGroup?.kind
            return (
              <button
                key={g.kind}
                onClick={() => { setGroupKind(g.kind); setSelectedId(null) }}
                className={`w-full text-start px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
              >
                <span className="truncate">{labelFor(g.kind)}</span>
                <span className="text-[10px] text-muted-foreground">{g.total > g.items.length ? `${g.items.length}+` : g.items.length}</span>
              </button>
            )
          })}
          <div className="px-3 pt-2 text-[10px] text-muted-foreground">{t('search.total', { count: totalResults })}</div>
        </div>
      </div>

      {/* Column 2: items of the selected type */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border truncate shrink-0">
          {activeGroup ? labelFor(activeGroup.kind) : ''}<span className="text-muted-foreground"> · {items.length}</span>
        </div>
        <div className="flex-1 scroll overflow-y-auto">
          {useGrid ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
              {items.map((m) => (
                <div key={`${m.kind}:${m.id}`} className={`cursor-pointer rounded-lg p-1 ${String(m.id) === String(selected?.id) ? 'bg-accent' : 'hover:bg-accent'}`} onClick={() => setSelectedId(m.id)} onDoubleClick={() => playItem(m)}>
                  <Poster icon={m.icon} seed={seedOf(m)} className="aspect-[2/3] w-full" />
                  <div className="text-xs font-medium truncate mt-1 px-0.5">{m.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((m) => (
                <div key={`${m.kind}:${m.id}`} className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${String(m.id) === String(selected?.id) ? 'bg-accent' : 'hover:bg-accent'}`} onClick={() => setSelectedId(m.id)} onDoubleClick={() => playItem(m)}>
                  <Poster icon={m.icon} seed={seedOf(m)} className="h-8 w-8" />
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{m.name}</div></div>
                  <span className="text-[10px] text-destructive flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />{t('common.liveBadge')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Column 3: preview */}
      <aside className="w-80 shrink-0  border-s border-border scroll overflow-y-auto">
        {selected ? (
          selected.kind === 'live' ? (
            <LivePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} fav={fav} />
          ) : selected.kind === 'series' ? (
            <SeriesPreview account={account} item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} fav={fav} />
          ) : (
            <MoviePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} fav={fav} />
          )
        ) : (
          <div className="p-5 text-xs text-muted-foreground">{t('common.selectItem')}</div>
        )}
      </aside>
    </>
  )
}
