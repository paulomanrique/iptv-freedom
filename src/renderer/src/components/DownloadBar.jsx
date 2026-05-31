// Barra fixa inferior com o download em andamento e o aviso de limite de conexão.
export default function DownloadBar({ onOpen }) {
  return (
    <div className="bar h-9 shrink-0 border-t border-white/10 flex items-center px-3 gap-3 text-2xs text-white/55">
      <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
      <button className="no-drag hover:text-white" onClick={onOpen}>
        <b className="text-white/80">O Falsário (2026)</b> · 62% · 8,4 MB/s
      </button>
      <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-accent" style={{ width: '62%' }} /></div>
      <span className="text-white/35">+1 na fila</span>
      <div className="flex-1" />
      <span className="text-amber-300/70">1 conexão (limite do provedor)</span>
    </div>
  )
}
