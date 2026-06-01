import { useEffect, useRef, useState } from 'react'
import mpegts from 'mpegts.js'

// Reproduz VOD (.mp4) com <video> nativo e ao vivo (.ts) via mpegts.js (MSE).
export default function PlayerModal({ item, onClose }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [error, setError] = useState(null)

  const isLive = item?.live || item?.type === 'live' || item?.ext === 'ts'

  useEffect(() => {
    if (!item) return
    let mpegtsPlayer = null
    let cancelled = false
    setStatus('loading')
    setError(null)

    async function start() {
      try {
        const url = await window.api.xtream.streamUrl(item.account, item.type, item.id, item.ext)
        if (cancelled) return
        const video = videoRef.current
        if (!video) return

        if (isLive && mpegts.isSupported()) {
          mpegtsPlayer = mpegts.createPlayer(
            { type: 'mpegts', isLive: true, url },
            { liveBufferLatencyChasing: true, lazyLoad: false }
          )
          mpegtsPlayer.attachMediaElement(video)
          mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail) => {
            if (!cancelled) { setError(`${type}: ${detail}`); setStatus('error') }
          })
          mpegtsPlayer.load()
          video.play().catch(() => {})
        } else {
          // VOD: o <video> nativo segue o redirect 302 e toca o mp4
          video.src = url
          video.play().catch(() => {})
        }
        if (!cancelled) setStatus('playing')
      } catch (e) {
        if (!cancelled) { setError(String(e?.message || e)); setStatus('error') }
      }
    }

    start()

    return () => {
      cancelled = true
      if (mpegtsPlayer) {
        try { mpegtsPlayer.destroy() } catch { /* noop */ }
      }
      const v = videoRef.current
      if (v) { try { v.pause(); v.removeAttribute('src'); v.load() } catch { /* noop */ } }
    }
  }, [item])

  // Fechar com ESC
  useEffect(() => {
    if (!item) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black animate-fadein">
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} controls autoPlay className="h-full w-full bg-black" />

          {status === 'loading' && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 grid place-items-center text-center px-8">
              <div>
                <div className="text-sm font-semibold text-red-300">Não foi possível reproduzir</div>
                <div className="text-2xs text-white/50 mt-2 max-w-md">{error}</div>
                <div className="text-[10px] text-white/35 mt-3">Dica: com limite de 1 conexão, feche outros streams/downloads ativos.</div>
              </div>
            </div>
          )}

          {/* Barra superior */}
          <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <div className="text-[11px] bg-black/50 rounded-full px-2.5 py-1 flex items-center gap-2 pointer-events-auto">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
              {isLive ? 'mpegts.js · ao vivo' : 'vídeo nativo · VOD'}
            </div>
            <div className="flex-1 text-[12px] text-white/85 truncate pr-2">{item.name}</div>
            <button onClick={onClose} className="pointer-events-auto h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 grid place-items-center shrink-0">✕</button>
          </div>
        </div>
      </div>
    </div>
  )
}
