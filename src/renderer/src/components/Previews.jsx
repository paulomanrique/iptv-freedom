import { useEffect, useState, useMemo } from 'react'
import { getSeriesInfo } from '../catalog'
import { gradient } from '../data'
import { smartTitleCase } from '../format'

export function Poster({ icon, seed, className }) {
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

function FavButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`h-9 w-9 grid place-items-center rounded-lg shrink-0 transition ${active ? 'bg-amber-400/20 text-amber-300' : 'bg-white/10 hover:bg-white/20 text-white/70'}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9z" />
      </svg>
    </button>
  )
}

// ---------- Filme ----------
export function MoviePreview({ item, seed, onPlay, onDownload, fav }) {
  const snapshot = { kind: 'vod', type: 'movie', id: item.id, name: item.name, icon: item.icon, ext: item.ext }
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && <FavButton active={fav.isFav('vod', item.id)} onClick={() => fav.toggle(snapshot)} />}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/45 mt-1.5">
        {item.rating && <span className="text-emerald-400">★ {item.rating}</span>}
        <span className="border border-white/20 rounded px-1 uppercase">{item.ext || 'mp4'}</span>
      </div>
      {item.plot && <p className="text-2xs text-white/60 mt-3 leading-relaxed line-clamp-6">{item.plot}</p>}
      <div className="flex flex-col gap-2 mt-4">
        <button onClick={() => onPlay({ type: 'movie', id: item.id, ext: item.ext, name: item.name })} className="bg-white text-black font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2 hover:bg-white/90">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Assistir
        </button>
        <button onClick={() => onDownload({ type: 'movie', id: item.id, ext: item.ext, name: item.name, icon: item.icon })} className="bg-white/12 hover:bg-white/20 font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>Baixar arquivo
        </button>
      </div>
    </div>
  )
}

// ---------- Canal ao vivo ----------
export function LivePreview({ item, seed, onPlay, fav }) {
  const snapshot = { kind: 'live', type: 'live', id: item.id, name: item.name, icon: item.icon }
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-video w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && <FavButton active={fav.isFav('live', item.id)} onClick={() => fav.toggle(snapshot)} />}
      </div>
      <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />AO VIVO</div>
      <button onClick={() => onPlay({ type: 'live', id: item.id, name: item.name, live: true })} className="w-full mt-4 bg-white text-black font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2 hover:bg-white/90">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Assistir
      </button>
      <div className="mt-4 p-3 rounded-lg bg-amber-400/10 text-amber-300/80 text-[10px]">Conteúdo ao vivo não pode ser baixado.</div>
    </div>
  )
}

// ---------- Série (temporadas + episódios) ----------
export function SeriesPreview({ account, item, seed, onPlay, onDownload, fav }) {
  const [info, setInfo] = useState(null)
  const [season, setSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const snapshot = { kind: 'series', type: 'series', id: item.id, name: item.name, icon: item.icon }

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
  const eps = info?.episodes?.[season] || []

  // Todos os episódios (todas as temporadas), para o "Baixar todos"
  const allEpisodes = useMemo(() => {
    return Object.entries(info?.episodes || {}).flatMap(([s, list]) =>
      (list || []).map((ep) => ({ ep, season: s }))
    )
  }, [info])

  const downloadAll = () => {
    allEpisodes.forEach(({ ep, season: s }) =>
      onDownload({ type: 'series', id: ep.id, ext: ep.container_extension, name: `${item.name} T${s}E${ep.episode_num}`, icon: item.icon })
    )
  }

  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && <FavButton active={fav.isFav('series', item.id)} onClick={() => fav.toggle(snapshot)} />}
      </div>
      {item.plot && <p className="text-2xs text-white/60 mt-2 leading-relaxed line-clamp-4">{item.plot}</p>}

      {loading && <div className="flex items-center gap-2 text-2xs text-white/45 py-4"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Carregando episódios…</div>}

      {seasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-3">
          {seasons.map((s) => (
            <button key={s} onClick={() => setSeason(s)} className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${s === season ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>T{s}</button>
          ))}
        </div>
      )}

      {allEpisodes.length > 0 && (
        <button
          onClick={downloadAll}
          className="w-full mb-3 bg-white/12 hover:bg-white/20 font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
          Baixar todos os episódios ({allEpisodes.length})
        </button>
      )}

      <div className="space-y-1.5">
        {eps.map((ep) => (
          <div key={ep.id} className="flex items-center gap-2 rounded-md hover:bg-white/5 px-2 py-1.5">
            <div className="flex-1 min-w-0"><div className="text-2xs font-medium truncate">{ep.episode_num}. {ep.title ? smartTitleCase(ep.title) : `Episódio ${ep.episode_num}`}</div></div>
            <button title="Assistir" onClick={() => onPlay({ type: 'series', id: ep.id, ext: ep.container_extension, name: `${item.name} · T${season}E${ep.episode_num}` })} className="h-7 w-7 grid place-items-center rounded-md bg-white/10 hover:bg-white/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <button title="Baixar" onClick={() => onDownload({ type: 'series', id: ep.id, ext: ep.container_extension, name: `${item.name} T${season}E${ep.episode_num}`, icon: item.icon })} className="h-7 w-7 grid place-items-center rounded-md bg-white/10 hover:bg-white/20">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
