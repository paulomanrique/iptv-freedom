import { MOVIES, SERIES, ACCOUNT, gradient } from '../data'

function Btn({ onClick, primary, children }) {
  return (
    <button
      onClick={onClick}
      className={`font-semibold rounded-lg py-2 text-2xs flex items-center justify-center gap-2 transition ${
        primary ? 'bg-white text-black hover:bg-white/90' : 'bg-white/12 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}

export default function PreviewPane({ mode, selected, onPlay, onDownload }) {
  if (mode === 'live') {
    return (
      <div className="p-5 text-2xs text-white/55">
        <div className="font-semibold text-white/80 text-sm mb-2">Canais ao vivo</div>
        Streams em MPEG-TS reproduzidos via mpegts.js. Selecione um canal para abrir o player.
        <div className="mt-4 p-3 rounded-lg bg-amber-400/10 text-amber-300/80 text-[10px]">
          Não é possível baixar conteúdo ao vivo — apenas filmes e séries (VOD).
        </div>
      </div>
    )
  }

  if (mode === 'accounts') {
    const rows = [
      ['Usuário', ACCOUNT.username], ['Status', ACCOUNT.status], ['Validade', ACCOUNT.exp],
      ['Conexões', ACCOUNT.connections], ['Formato', ACCOUNT.format]
    ]
    return (
      <div className="p-5 space-y-3 text-2xs">
        <div className="font-semibold text-white/80 text-sm">{ACCOUNT.host}</div>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-white/45">{k}</span>
            <span className={k === 'Status' ? 'text-emerald-400' : ''}>{v}</span>
          </div>
        ))}
      </div>
    )
  }

  if (mode === 'downloads') {
    return <div className="p-5 text-2xs text-white/45">Fila de downloads. Limite de 1 conexão simultânea — os itens rodam um a um.</div>
  }

  const items = mode === 'series' ? SERIES : MOVIES
  const m = items[selected] || items[0]
  const i = selected || 0

  return (
    <div className="p-4">
      <div className="poster aspect-[2/3] w-full rounded-xl ring-1 ring-white/10 mb-4" style={{ background: gradient(i) }} />
      <h2 className="text-base font-bold leading-tight">{m.t}</h2>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/45 mt-1.5">
        <span className="text-emerald-400">96%</span><span>{m.y}</span><span>{m.d}</span>
        <span className="border border-white/20 rounded px-1">{m.q}</span><span>{m.g}</span>
      </div>
      <p className="text-2xs text-white/60 mt-3 leading-relaxed">
        Sinopse: produção {m.y} em {m.q}. Áudio 5.1, legendas PT/EN.
      </p>

      <div className="flex flex-col gap-2 mt-4">
        <Btn primary onClick={() => onPlay(m)}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>Assistir
        </Btn>
        {mode !== 'series' && (
          <Btn onClick={() => onDownload(m)}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
            Baixar arquivo · {m.sz}
          </Btn>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-[10px] text-white/40 space-y-1.5">
        <div className="flex justify-between"><span>Contêiner</span><span className="text-white/65">mp4</span></div>
        <div className="flex justify-between"><span>Resolução</span><span className="text-white/65">{m.q === '4K' ? '3840×2160' : '1920×1080'}</span></div>
        <div className="flex justify-between"><span>Tamanho</span><span className="text-white/65">{m.sz || '—'}</span></div>
      </div>
    </div>
  )
}
