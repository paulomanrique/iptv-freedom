import { useEffect, useRef, useState } from 'react'
import mpegts from 'mpegts.js'

// Presets de pré-cache (buffer) para o ao vivo via mpegts.js.
// stashInitialSize = buffer inicial; latencyChasing corta buffer p/ baixar a latência.
const BUFFER_PRESETS = {
  low: {
    label: 'Baixa latência',
    enableStashBuffer: false,
    stashInitialSize: 128 * 1024,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 1.5,
    liveBufferLatencyMinRemain: 0.3
  },
  balanced: {
    label: 'Equilibrado',
    enableStashBuffer: true,
    stashInitialSize: 384 * 1024,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 4.0,
    liveBufferLatencyMinRemain: 1.0
  },
  high: {
    label: 'Mais buffer',
    enableStashBuffer: true,
    stashInitialSize: 1024 * 1024,
    liveBufferLatencyChasing: false
  }
}
const BUFFER_KEY = 'iptvfreedom.bufferPreset'

// Reproduz VOD (.mp4) com <video> nativo e ao vivo (.ts) via mpegts.js (MSE).
export default function PlayerModal({ item, onClose }) {
  const videoRef = useRef(null)
  const hideTimer = useRef(null)
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [error, setError] = useState(null)
  const [chrome, setChrome] = useState(true) // overlay (topo) visível
  const [buffer, setBuffer] = useState(() => localStorage.getItem(BUFFER_KEY) || 'balanced')

  const isLive = item?.live || item?.type === 'live' || item?.ext === 'ts'

  const changeBuffer = (key) => {
    localStorage.setItem(BUFFER_KEY, key)
    setBuffer(key)
  }

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
          const { label, ...cfg } = BUFFER_PRESETS[buffer] || BUFFER_PRESETS.balanced
          mpegtsPlayer = mpegts.createPlayer(
            { type: 'mpegts', isLive: true, url },
            { lazyLoad: false, ...cfg }
          )
          mpegtsPlayer.attachMediaElement(video)
          mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail) => {
            if (!cancelled) { setError(`${type}: ${detail}`); setStatus('error') }
          })
          mpegtsPlayer.load()
          video.play().catch(() => {})
        } else {
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
  }, [item, buffer])

  // Fechar com ESC
  useEffect(() => {
    if (!item) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  // Auto-ocultar o chrome após inatividade do mouse
  const pokeChrome = () => {
    setChrome(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setChrome(false), 2600)
  }
  useEffect(() => {
    if (!item) return
    pokeChrome()
    return () => clearTimeout(hideTimer.current)
  }, [item])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative w-full max-w-6xl rounded-2xl overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 bg-black animate-fadein ${chrome ? '' : 'cursor-none'}`}
        onMouseMove={pokeChrome}
        onMouseLeave={() => setChrome(false)}
      >
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} controls autoPlay className="h-full w-full bg-black" />

          {status === 'loading' && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none bg-black/30">
              <span className="h-12 w-12 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 grid place-items-center text-center px-8 bg-black/60">
              <div>
                <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-red-500/15 grid place-items-center">
                  <svg className="h-6 w-6 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                </div>
                <div className="text-sm font-semibold text-white">Não foi possível reproduzir</div>
                <div className="text-2xs text-white/50 mt-2 max-w-md mx-auto">{error}</div>
                <div className="text-[10px] text-white/35 mt-3">Com limite de 1 conexão, feche outros streams/downloads ativos.</div>
              </div>
            </div>
          )}

          {/* Chrome superior (auto-oculta) */}
          <div className={`absolute top-0 inset-x-0 px-4 py-3 flex items-center gap-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent transition-opacity duration-300 ${chrome ? 'opacity-100' : 'opacity-0'}`}>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white bg-red-600/90 rounded-full px-2.5 py-1 shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />AO VIVO
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate drop-shadow">{item.name}</div>
            </div>
            {isLive && (
              <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur rounded-full p-0.5 shrink-0" title="Pré-cache / buffer">
                {Object.entries(BUFFER_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => changeBuffer(key)}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition ${buffer === key ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              title="Fechar (Esc)"
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur grid place-items-center text-white/90 shrink-0 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
