// Botões de controle da janela (somente Windows/Linux; no macOS usamos os
// "traffic lights" nativos via titleBarStyle: hiddenInset).
export default function WindowControls() {
  const isMac = window.api?.platform === 'darwin'
  if (isMac) return null

  const btn = 'no-drag h-7 w-9 grid place-items-center rounded-md hover:bg-white/10 text-white/55 hover:text-white transition'
  return (
    <div className="flex items-center gap-0.5">
      <button className={btn} onClick={() => window.api.window.minimize()} title="Minimizar">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
      </button>
      <button className={btn} onClick={() => window.api.window.maximize()} title="Maximizar">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
      </button>
      <button className="no-drag h-7 w-9 grid place-items-center rounded-md hover:bg-red-500/80 text-white/55 hover:text-white transition" onClick={() => window.api.window.close()} title="Fechar">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>
  )
}
