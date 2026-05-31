import { useEffect, useState, useMemo } from 'react'
import { getCategories, getStreams, getSeriesInfo, normalize } from '../catalog'
import { gradient } from '../data'

const MAX_RESULTS = 400

function Poster({ icon, seed, className }) {
  const [failed, setFailed] = useState(false)
  if (icon && !failed) {
    return (
      <div className={`rounded-md ring-1 ring-white/10 shrink-0 overflow-hidden bg-black/30 ${className}`}>
        <img src={icon} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      </div>
    )
  }
  return <div className={`poster rounded-md ring-1 ring-white/10 shrink-0 ${className}`} style={{ background: gradient(seed) }} />
}

// ---------- Preview de filme ----------
function MoviePreview({ item, seed, onPlay, onDownload }) {
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <h2 className="text-base font-bold leading-tight">{item.name}</h2>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/45 mt-1.5">
        {item.rating && <span className="text-emerald-400">★ {item.rating}</span>}
        <span className="border border-white/20 rounded px-1 uppercase">{item.ext || 'mp4'}</span>
      </div>
      {item.plot && <p className="text-2xs text-white/60 mt-3 leading-relaxed line-clamp-6">{item.plot}</p>}
      <div className="flex flex-col gap-2 mt-4">
        <button onClick={() => onPlay({ type: 'movie', id: item.id, ext: item.ext, name: item.name })} className="bg-white text-black font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2 hover:bg-white/90">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Assistir
        </button>
        <button onClick={() => onDownload({ type: 'movie', id: item.id, ext: item.ext, name: item.name })} className="bg-white/12 hover:bg-white/20 font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>Baixar arquivo
        </button>
      </div>
    </div>
  )
}

// ---------- Preview de canal ao vivo ----------
function LivePreview({ item, seed, onPlay }) {
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-video w-full mb-4" />
      <h2 className="text-base font-bold leading-tight">{item.name}</h2>
      <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />AO VIVO</div>
      <button onClick={() => onPlay({ type: 'live', id: item.id, name: item.name, live: true })} className="w-full mt-4 bg-white text-black font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2 hover:bg-white/90">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Assistir
      </button>
      <div className="mt-4 p-3 rounded-lg bg-amber-400/10 text-amber-300/80 text-[10px]">Conteúdo ao vivo não pode ser baixado.</div>
    </div>
  )
}

// ---------- Preview de série (temporadas + episódios) ----------
function SeriesPreview({ account, item, seed, onPlay, onDownload }) {
  const [info, setInfo] = useState(null)
  const [season, setSeason] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setInfo(null)
    getSeriesInfo(account, item.id)
      .then((res) => {
        if (!alive) return
        setInfo(res)
        const seasons = Object.keys(res.episodes || {})
        setSeason(seasons[0] || null)
      })
      .catch(() => alive && setInfo({ episodes: {} }))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [account.id, item.id])

  const seasons = info ? Object.keys(info.episodes || {}) : []
  const eps = (info?.episodes?.[season] || [])

  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <h2 className="text-base font-bold leading-tight">{item.name}</h2>
      {item.plot && <p className="text-2xs text-white/60 mt-2 leading-relaxed line-clamp-4">{item.plot}</p>}

      {loading && <div className="flex items-center gap-2 text-2xs text-white/45 py-4"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Carregando episódios…</div>}

      {seasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-3">
          {seasons.map((s) => (
            <button key={s} onClick={() => setSeason(s)} className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${s === season ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>T{s}</button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {eps.map((ep) => (
          <div key={ep.id} className="flex items-center gap-2 rounded-md hover:bg-white/5 px-2 py-1.5">
            <div className="flex-1 min-w-0"><div className="text-2xs font-medium truncate">{ep.episode_num}. {ep.title || `Episódio ${ep.episode_num}`}</div></div>
            <button title="Assistir" onClick={() => onPlay({ type: 'series', id: ep.id, ext: ep.container_extension, name: `${item.name} · T${season}E${ep.episode_num}` })} className="h-7 w-7 grid place-items-center rounded-md bg-white/10 hover:bg-white/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <button title="Baixar" onClick={() => onDownload({ type: 'series', id: ep.id, ext: ep.container_extension, name: `${item.name} T${season}E${ep.episode_num}` })} className="h-7 w-7 grid place-items-center rounded-md bg-white/10 hover:bg-white/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LibraryView({ account, kind, viewStyle, query, onPlay, onDownload }) {
  const [categories, setCategories] = useState([])
  const [catId, setCatId] = useState(null)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const searching = query.trim().length > 0

  // Carrega categorias quando muda a conta/tipo
  useEffect(() => {
    let alive = true
    setError(null)
    getCategories(account, kind)
      .then((cats) => {
        if (!alive) return
        setCategories(cats)
        setCatId(cats[0]?.category_id || null)
      })
      .catch((e) => alive && setError(String(e?.message || e)))
    return () => { alive = false }
  }, [account.id, kind])

  // Carrega streams (categoria selecionada, ou TODOS quando buscando)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const cat = searching ? null : catId
    if (!searching && !catId) { setItems([]); setLoading(false); return }
    getStreams(account, kind, cat)
      .then((list) => {
        if (!alive) return
        const norm = (list || []).map((x) => normalize(x, kind))
        setItems(norm)
        setSelectedId(norm[0]?.id ?? null)
      })
      .catch((e) => alive && setError(String(e?.message || e)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [account.id, kind, catId, searching])

  const filtered = useMemo(() => {
    if (!searching) return items
    const q = query.trim().toLowerCase()
    return items.filter((i) => i.name?.toLowerCase().includes(q)).slice(0, MAX_RESULTS)
  }, [items, query, searching])

  const visible = searching ? filtered : items.slice(0, MAX_RESULTS)
  const selected = visible.find((i) => i.id === selectedId) || visible[0]
  const seedOf = (i) => (visible.indexOf(i) + 1) * 3

  if (!account) {
    return <section className="flex-1 grid place-items-center text-2xs text-white/45">Adicione e ative uma conta para navegar.</section>
  }

  return (
    <>
      <section className="flex-1 min-w-0 scroll overflow-y-auto">
        {/* Chips de categoria */}
        {!searching && categories.length > 0 && (
          <div className="sticky top-0 bar z-10 px-3 py-2 border-b border-white/10 flex gap-1.5 overflow-x-auto scroll">
            {categories.map((c) => (
              <button key={c.category_id} onClick={() => setCatId(c.category_id)} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${c.category_id === catId ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
                {c.category_name}
              </button>
            ))}
          </div>
        )}
        {searching && <div className="px-4 py-2 text-2xs text-white/45 border-b border-white/10">Buscando “{query}” em {kind === 'live' ? 'canais' : kind === 'series' ? 'séries' : 'filmes'}…</div>}

        {error && <div className="m-4 text-2xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2">Erro: {error}</div>}
        {loading && <div className="flex items-center gap-2 text-2xs text-white/45 p-4"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Carregando…</div>}

        {!loading && visible.length === 0 && !error && <div className="p-6 text-2xs text-white/45 text-center">Nada encontrado.</div>}

        {!loading && visible.length > 0 && (viewStyle === 'grid' || kind === 'series') ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
            {visible.map((m) => (
              <div key={m.id} className="cursor-pointer" onClick={() => setSelectedId(m.id)}>
                <Poster icon={m.icon} seed={seedOf(m)} className="aspect-[2/3] w-full" />
                <div className="text-2xs font-medium truncate mt-1">{m.name}</div>
              </div>
            ))}
          </div>
        ) : (
          !loading && visible.length > 0 && (
            <div className="divide-y divide-white/5">
              {visible.map((m) => (
                <div key={m.id} className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${m.id === selected?.id ? 'bg-accent/20' : 'hover:bg-white/5'}`} onClick={() => setSelectedId(m.id)}>
                  <Poster icon={m.icon} seed={seedOf(m)} className={kind === 'live' ? 'h-8 w-8' : 'h-9 w-6'} />
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{m.name}</div></div>
                  {kind === 'live' && <span className="text-[10px] text-red-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>}
                  {kind === 'vod' && m.ext && <span className="text-[10px] text-white/40 uppercase">{m.ext}</span>}
                </div>
              ))}
            </div>
          )
        )}
        {visible.length === MAX_RESULTS && <div className="px-4 py-2 text-[10px] text-white/35">Mostrando os primeiros {MAX_RESULTS} resultados.</div>}
      </section>

      <aside className="w-80 shrink-0 bar border-l border-white/10 scroll overflow-y-auto">
        {selected ? (
          kind === 'live' ? (
            <LivePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} />
          ) : kind === 'series' ? (
            <SeriesPreview account={account} item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} />
          ) : (
            <MoviePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} onDownload={onDownload} />
          )
        ) : (
          <div className="p-5 text-2xs text-white/45">Selecione um item.</div>
        )}
      </aside>
    </>
  )
}
