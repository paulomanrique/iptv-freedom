import { gradient } from '../data'
import { formatBytes, formatSpeed, downloadLabel } from '../format'

function Row({ d, seed, onPause, onResume, onCancel, onOpen }) {
  const pct = d.total ? Math.min(100, Math.round((d.received / d.total) * 100)) : 0
  const done = d.status === 'done'
  const active = d.status === 'downloading'
  const err = d.status === 'error'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="h-9 w-6 rounded-md shrink-0" style={{ background: gradient(seed) }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="font-medium truncate">{d.name}</span>
          <span className={`text-[10px] shrink-0 ${done ? 'text-emerald-400' : err ? 'text-red-400' : 'text-white/45'}`}>
            {active && d.speed ? formatSpeed(d.speed) : downloadLabel(d.status)}
          </span>
        </div>
        <div className="text-[10px] text-white/40 mb-1">
          {d.total ? `${formatBytes(d.received)} / ${formatBytes(d.total)}` : formatBytes(d.received)}
          {err && d.error ? ` · ${d.error}` : ''}
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full ${done ? 'bg-emerald-400' : err ? 'bg-red-400' : 'bg-accent'}`} style={{ width: `${done ? 100 : pct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {done && (
          <button title="Abrir pasta" onClick={() => onOpen(d.id)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-white/60">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          </button>
        )}
        {active && (
          <button title="Pausar" onClick={() => onPause(d.id)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-white/60">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          </button>
        )}
        {(d.status === 'paused' || err) && (
          <button title="Retomar" onClick={() => onResume(d.id)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10 text-white/60">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
        {!done && (
          <button title="Cancelar" onClick={() => onCancel(d.id)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-red-500/30 text-white/60">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function DownloadsView({ downloads, onPause, onResume, onCancel, onOpen }) {
  return (
    <section className="flex-1 min-w-0 scroll overflow-y-auto">
      <div className="px-4 py-2 text-[10px] text-amber-300/70 bg-amber-400/10 border-b border-white/10">
        Limite do provedor: 1 conexão. Os downloads rodam um de cada vez (em fila).
      </div>
      {downloads.length === 0 ? (
        <div className="p-10 text-2xs text-white/45 text-center">Nenhum download ainda. Use o botão “Baixar arquivo” em um filme ou episódio.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {downloads.map((d, i) => (
            <Row key={d.id} d={d} seed={i + 1} onPause={onPause} onResume={onResume} onCancel={onCancel} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  )
}
