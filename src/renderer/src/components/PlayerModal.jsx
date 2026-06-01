import { useEffect, useRef, useState } from 'react'
import mpegts from 'mpegts.js'

// Presets de pré-cache (buffer) para o ao vivo via mpegts.js.
// stashInitialSize = buffer inicial; latencyChasing corta buffer p/ baixar a latência.
const BUFFER_PRESETS = {
  low: {
    label: 'Baixa latência',
    enableStashBuffer: true,
    stashInitialSize: 384 * 1024,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 4.0,
    liveBufferLatencyMinRemain: 1.0
  },
  balanced: {
    label: 'Equilibrado',
    enableStashBuffer: true,
    stashInitialSize: 1024 * 1024,
    liveBufferLatencyChasing: false
  },
  high: {
    label: 'Mais buffer',
    enableStashBuffer: true,
    stashInitialSize: 4 * 1024 * 1024,
    liveBufferLatencyChasing: false
  }
}
const BUFFER_KEY = 'iptvfreedom.bufferPreset'
const AUTO_KEY = 'iptvfreedom.bufferAuto'
const BUFFER_ORDER = ['low', 'balanced', 'high']
const AUTO_WINDOW_MS = 20000 // janela de observação de travadas
const AUTO_MAX_STALLS = 2 // travadas dentro da janela para subir de nível

// Reproduz VOD (.mp4) com <video> nativo e ao vivo (.ts) via mpegts.js (MSE).
export default function PlayerModal({ item, onClose }) {
  const videoRef = useRef(null)
  const hideTimer = useRef(null)
  const statsRef = useRef({}) // última info do STATISTICS_INFO (speed em KB/s, etc.)
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [error, setError] = useState(null)
  const [chrome, setChrome] = useState(true) // overlay (topo) visível
  const rebufferTimes = useRef([])
  const loadStamp = useRef(0)
  const [auto, setAuto] = useState(() => localStorage.getItem(AUTO_KEY) !== 'false')
  const [buffer, setBuffer] = useState(() =>
    localStorage.getItem(AUTO_KEY) !== 'false' ? 'low' : localStorage.getItem(BUFFER_KEY) || 'balanced'
  )
  const [notice, setNotice] = useState(null)

  const isLive = item?.live || item?.type === 'live' || item?.ext === 'ts'

  // Seleção manual de buffer (desliga o modo automático)
  const pickBuffer = (key) => {
    setAuto(false)
    localStorage.setItem(AUTO_KEY, 'false')
    localStorage.setItem(BUFFER_KEY, key)
    setBuffer(key)
  }

  // Liga/desliga o modo automático (começa em baixa latência e sobe se travar)
  const toggleAuto = () => {
    const next = !auto
    setAuto(next)
    localStorage.setItem(AUTO_KEY, String(next))
    if (next) {
      rebufferTimes.current = []
      setBuffer('low')
    }
  }

  useEffect(() => {
    if (!item) return
    let mpegtsPlayer = null
    let cancelled = false
    setStatus('loading')
    setError(null)
    rebufferTimes.current = []

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
          mpegtsPlayer.on(mpegts.Events.STATISTICS_INFO, (info) => { statsRef.current = info })
          mpegtsPlayer.load()
          video.play().catch(() => {})
        } else {
          video.src = url
          video.play().catch(() => {})
        }
        loadStamp.current = Date.now()
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

  // Estatísticas do ao vivo (velocidade de download + buffer à frente)
  useEffect(() => {
    if (!item || !isLive) { setStats(null); return }
    statsRef.current = {}
    const id = setInterval(() => {
      const v = videoRef.current
      let buffer = 0
      if (v && v.buffered && v.buffered.length) {
        for (let i = 0; i < v.buffered.length; i++) {
          if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
            buffer = v.buffered.end(i) - v.currentTime
            break
          }
        }
      }
      const info = statsRef.current || {}
      // info.speed vem em KB/s; converte para Mbps
      const mbps = info.speed ? (info.speed * 8) / 1000 : 0
      setStats({ mbps, buffer, dropped: info.droppedFrames || 0 })
    }, 1000)
    return () => clearInterval(id)
  }, [item, isLive])

  // Modo automático: sobe de nível de buffer quando trava demais
  useEffect(() => {
    if (!item || !isLive || !auto) return
    const v = videoRef.current
    if (!v) return
    const onWaiting = () => {
      if (Date.now() - loadStamp.current < 3000) return // ignora o buffering inicial
      const now = Date.now()
      rebufferTimes.current = rebufferTimes.current.filter((t) => now - t < AUTO_WINDOW_MS)
      rebufferTimes.current.push(now)
      if (rebufferTimes.current.length >= AUTO_MAX_STALLS) {
        const i = BUFFER_ORDER.indexOf(buffer)
        if (i < BUFFER_ORDER.length - 1) {
          const next = BUFFER_ORDER[i + 1]
          rebufferTimes.current = []
          setBuffer(next) // reinicia o stream com mais buffer
          setNotice(`Travando muito — aumentando buffer: ${BUFFER_PRESETS[next].label}`)
        }
      }
    }
    v.addEventListener('waiting', onWaiting)
    return () => v.removeEventListener('waiting', onWaiting)
  }, [item, isLive, auto, buffer])

  // Esconde o aviso automaticamente
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

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

          {notice && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-2xs text-white bg-black/70 backdrop-blur rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              {notice}
            </div>
          )}

          {/* Chrome superior (auto-oculta) */}
          <div className={`absolute top-0 inset-x-0 px-4 py-3 flex items-center gap-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent transition-opacity duration-300 ${chrome ? 'opacity-100' : 'opacity-0'}`}>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white bg-red-600/90 rounded-full px-2.5 py-1 shadow shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />AO VIVO
              </span>
            )}
            {isLive && stats && (
              <span className="flex items-center gap-2 text-[11px] tabular-nums text-white/90 bg-black/40 backdrop-blur rounded-full px-2.5 py-1 shrink-0">
                <span title="Velocidade de download do stream">↓ {stats.mbps.toFixed(1)} Mbps</span>
                <span className="text-white/30">·</span>
                <span title="Segundos de vídeo em buffer à frente" className={stats.buffer < 1 ? 'text-red-300' : stats.buffer < 2.5 ? 'text-amber-300' : 'text-emerald-300'}>
                  buffer {stats.buffer.toFixed(1)}s
                </span>
                {stats.dropped > 0 && <><span className="text-white/30">·</span><span className="text-white/60" title="Quadros descartados">{stats.dropped} drops</span></>}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate drop-shadow">{item.name}</div>
            </div>
            {isLive && (
              <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur rounded-full p-0.5 shrink-0" title="Pré-cache / buffer (Auto sobe o buffer se travar)">
                <button
                  onClick={toggleAuto}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition ${auto ? 'bg-accent text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                >
                  Auto
                </button>
                {BUFFER_ORDER.map((key) => {
                  const manualActive = !auto && buffer === key
                  const autoAt = auto && buffer === key
                  return (
                    <button
                      key={key}
                      onClick={() => pickBuffer(key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full transition ${manualActive ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'} ${autoAt ? 'ring-1 ring-accent/70 text-white' : ''}`}
                    >
                      {BUFFER_PRESETS[key].label}
                    </button>
                  )
                })}
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
