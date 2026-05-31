import { MOVIES, SERIES, LIVE, DOWNLOADS, ACCOUNT, gradient } from '../data'

function Thumb({ i, className }) {
  return <div className={`poster rounded-md ring-1 ring-white/10 shrink-0 ${className}`} style={{ background: gradient(i) }} />
}

function ListHeader() {
  return (
    <div className="sticky top-0 bar text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-3 px-4 py-2 border-b border-white/10 z-10">
      <span className="w-6" />
      <span className="flex-1">Título</span>
      <span className="w-12 text-center">Ano</span>
      <span className="w-14 text-center">Duração</span>
      <span className="w-12 text-center">Qual.</span>
      <span className="w-16 text-right">Tamanho</span>
    </div>
  )
}

export default function ContentList({ view, mode, viewStyle, selected, onSelect, onPlay }) {
  // Canais ao vivo
  if (mode === 'live') {
    return (
      <div className="divide-y divide-white/5">
        {LIVE.concat(LIVE).map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5" onClick={() => onPlay({ t: c, live: true })}>
            <Thumb i={i} className="h-8 w-8" />
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{c}</div></div>
            <span className="text-[10px] text-red-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />LIVE</span>
          </div>
        ))}
      </div>
    )
  }

  // Downloads
  if (mode === 'downloads') {
    return (
      <div className="divide-y divide-white/5">
        {DOWNLOADS.map((d, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Thumb i={i} className="h-9 w-6" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-2">
                <span className="font-medium truncate">{d.t}</span>
                <span className={`text-[10px] ${d.state === 'done' ? 'text-emerald-400' : 'text-white/45'}`}>{d.status}</span>
              </div>
              <div className="text-[10px] text-white/40 mb-1">{d.meta}</div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full ${d.state === 'done' ? 'bg-emerald-400' : 'bg-accent'}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Contas
  if (mode === 'accounts') {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-lg p-3 flex items-center gap-3 bg-accent/20">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center text-2xs font-bold">A1</div>
          <div className="flex-1"><div className="font-semibold">{ACCOUNT.host}</div><div className="text-[10px] text-white/45">{ACCOUNT.username} · {ACCOUNT.status}</div></div>
        </div>
        <button className="w-full border border-dashed border-white/20 rounded-lg p-3 text-white/55 hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2 text-2xs">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Adicionar conta
        </button>
      </div>
    )
  }

  // Filmes / Séries
  const items = mode === 'series' ? SERIES : MOVIES

  if (viewStyle === 'grid') {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
        {items.map((m, i) => (
          <div key={i} className="cursor-pointer" onClick={() => onSelect(i)}>
            <Thumb i={i} className="aspect-[2/3] w-full" />
            <div className="text-2xs font-medium truncate mt-1">{m.t}</div>
            <div className="text-[10px] text-white/40">{m.y} · {m.q}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <ListHeader />
      <div className="divide-y divide-white/5">
        {items.map((m, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${i === selected ? 'bg-accent/20' : 'hover:bg-white/5'}`}
            onClick={() => onSelect(i)}
          >
            <Thumb i={i} className="h-9 w-6" />
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{m.t}</div><div className="text-[10px] text-white/40">{m.g}</div></div>
            <div className="w-12 text-2xs text-white/45 text-center">{m.y}</div>
            <div className="w-14 text-2xs text-white/45 text-center">{m.d}</div>
            <div className="w-12 text-2xs text-center"><span className="border border-white/20 rounded px-1">{m.q}</span></div>
            <div className="w-16 text-2xs text-white/45 text-right">{m.sz || '—'}</div>
          </div>
        ))}
      </div>
    </>
  )
}
