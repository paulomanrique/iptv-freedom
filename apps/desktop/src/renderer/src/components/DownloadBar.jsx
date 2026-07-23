import { useTranslation } from 'react-i18next'
import { formatBytes, formatSpeed, downloadLabel } from '../format'

// Barra fixa inferior: mostra o download ativo (ou fila) e o aviso de limite.
export default function DownloadBar({ downloads, onOpen }) {
  const { t } = useTranslation()
  const active = downloads.find((d) => d.status === 'downloading')
  const queued = downloads.filter((d) => d.status === 'queued').length
  const current = active || downloads.find((d) => d.status === 'queued')
  const pct = current?.total ? Math.min(100, Math.round((current.received / current.total) * 100)) : 0

  return (
    <div className="bar h-9 shrink-0 border-t border-white/10 flex items-center px-3 gap-3 text-2xs text-white/55">
      <svg className="h-3.5 w-3.5 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
      {current ? (
        <>
          <button className="no-drag hover:text-white truncate max-w-[40%]" onClick={onOpen}>
            <b className="text-white/80">{current.name}</b> · {active ? `${pct}%` : downloadLabel(current.status)}
            {active && current.speed ? ` · ${formatSpeed(current.speed)}` : ''}
          </button>
          <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
          {queued > 0 && <span className="text-white/35">{t('downloadBar.queued', { count: active ? queued : queued - 1 })}</span>}
        </>
      ) : (
        <button className="no-drag hover:text-white" onClick={onOpen}>{t('downloadBar.none')}</button>
      )}
      <div className="flex-1" />
      <span className="text-amber-300/70 shrink-0">{t('downloadBar.connectionLimit')}</span>
    </div>
  )
}
