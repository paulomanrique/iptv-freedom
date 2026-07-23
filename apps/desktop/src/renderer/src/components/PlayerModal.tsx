import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account, StreamType } from '@iptv/contracts'
import mpegts from 'mpegts.js'

// Pre-cache (buffer) presets for live playback via mpegts.js.
// stashInitialSize = initial buffer; latencyChasing trims the buffer to lower latency.
// Each preset label comes from i18n (player.buffer.<key>).
const BUFFER_PRESETS = {
  low: {
    enableStashBuffer: true,
    stashInitialSize: 384 * 1024,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 4.0,
    liveBufferLatencyMinRemain: 1.0
  },
  balanced: {
    enableStashBuffer: true,
    stashInitialSize: 1024 * 1024,
    liveBufferLatencyChasing: false
  },
  high: {
    enableStashBuffer: true,
    stashInitialSize: 4 * 1024 * 1024,
    liveBufferLatencyChasing: false
  }
} as const
type BufferPreset = keyof typeof BUFFER_PRESETS
const BUFFER_KEY = 'iptvfreedom.bufferPreset'
const AUTO_KEY = 'iptvfreedom.bufferAuto'
const BUFFER_ORDER: BufferPreset[] = ['low', 'balanced', 'high']
const AUTO_WINDOW_MS = 20000 // stall observation window
const AUTO_MAX_STALLS = 2 // stalls within the window before moving up a level

// Plays VOD (.mp4) with a native <video> and live (.ts) via mpegts.js (MSE).
interface PlayerItem {
  account: Account
  type: StreamType
  id: string | number
  ext?: string
  name?: string
  live?: boolean
}
interface PlayerModalProps { item: PlayerItem | Record<string, any> | null; onClose: () => void }
interface PlayerStats { mbps: number; buffer: number; dropped: number }

export default function PlayerModal({ item, onClose }: PlayerModalProps) {
  const { t } = useTranslation()
  const bufferLabel = (key: BufferPreset) => t(`player.buffer.${key}`)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statsRef = useRef<Record<string, any>>({}) // latest STATISTICS_INFO data (speed in KB/s, etc.)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [status, setStatus] = useState('loading') // loading | playing | error
  const [error, setError] = useState<string | null>(null)
  const [chrome, setChrome] = useState(true) // top overlay visible
  const rebufferTimes = useRef<number[]>([])
  const loadStamp = useRef(0)
  const [auto, setAuto] = useState(() => localStorage.getItem(AUTO_KEY) !== 'false')
  const [buffer, setBuffer] = useState<BufferPreset>(() => {
    const saved = localStorage.getItem(BUFFER_KEY)
    return localStorage.getItem(AUTO_KEY) !== 'false' ? 'low' : saved === 'low' || saved === 'high' ? saved : 'balanced'
  })
  const [notice, setNotice] = useState<string | null>(null)

  const isLive = item?.live || item?.type === 'live' || item?.ext === 'ts'

  // Manual buffer selection (turns off automatic mode)
  const pickBuffer = (key: BufferPreset) => {
    setAuto(false)
    localStorage.setItem(AUTO_KEY, 'false')
    localStorage.setItem(BUFFER_KEY, key)
    setBuffer(key)
  }

  // Toggles automatic mode (starts at low latency and rises if it stalls)
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
    let mpegtsPlayer: ReturnType<typeof mpegts.createPlayer> | null = null
    let cancelled = false
    setStatus('loading')
    setError(null)
    rebufferTimes.current = []

    async function start() {
      try {
        const url = await window.api.xtream.streamUrl(item!.account, item!.type, item!.id, item!.ext)
        if (cancelled) return
        const video = videoRef.current
        if (!video) return

        if (isLive && mpegts.isSupported()) {
          const cfg = BUFFER_PRESETS[buffer] || BUFFER_PRESETS.balanced
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
      } catch (e: unknown) {
        if (!cancelled) { setError(String(e instanceof Error ? e.message : e)); setStatus('error') }
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

  // Close with ESC
  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  // Live statistics (download speed + buffer ahead)
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
      // info.speed comes in KB/s; convert to Mbps
      const mbps = info.speed ? (info.speed * 8) / 1000 : 0
      setStats({ mbps, buffer, dropped: info.droppedFrames || 0 })
    }, 1000)
    return () => clearInterval(id)
  }, [item, isLive])

  // Automatic mode: raises the buffer level when it stalls too often
  useEffect(() => {
    if (!item || !isLive || !auto) return
    const v = videoRef.current
    if (!v) return
    const onWaiting = () => {
      if (Date.now() - loadStamp.current < 3000) return // ignore the initial buffering
      const now = Date.now()
      rebufferTimes.current = rebufferTimes.current.filter((t) => now - t < AUTO_WINDOW_MS)
      rebufferTimes.current.push(now)
      if (rebufferTimes.current.length >= AUTO_MAX_STALLS) {
        const i = BUFFER_ORDER.indexOf(buffer)
        if (i < BUFFER_ORDER.length - 1) {
          const next = BUFFER_ORDER[i + 1]
          rebufferTimes.current = []
          setBuffer(next) // restart the stream with more buffer
          setNotice(t('player.autoBuffering', { label: bufferLabel(next) }))
        }
      }
    }
    v.addEventListener('waiting', onWaiting)
    return () => v.removeEventListener('waiting', onWaiting)
  }, [item, isLive, auto, buffer, t])

  // Hide the notice automatically
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  // Auto-hide the chrome after mouse inactivity
  const pokeChrome = () => {
    setChrome(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setChrome(false), 2600)
  }
  useEffect(() => {
    if (!item) return
    pokeChrome()
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [item])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div
        className={`relative w-full max-w-6xl overflow-hidden rounded-lg bg-black shadow-xl ring-1 ring-white/10 ${chrome ? '' : 'cursor-none'}`}
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
                <div className="text-sm font-semibold text-white">{t('player.cantPlay')}</div>
                <div className="text-2xs text-white/50 mt-2 max-w-md mx-auto">{error}</div>
                <div className="text-[10px] text-white/35 mt-3">{t('player.oneConnHint')}</div>
              </div>
            </div>
          )}

          {notice && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-2xs text-white bg-black/70 backdrop-blur rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
              {notice}
            </div>
          )}

          {/* Top chrome (auto-hides) */}
          <div className={`absolute top-0 inset-x-0 px-4 py-3 flex items-center gap-3 bg-gradient-to-b from-black/75 via-black/30 to-transparent transition-opacity duration-300 ${chrome ? 'opacity-100' : 'opacity-0'}`}>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white bg-red-600/90 rounded-full px-2.5 py-1 shadow shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{t('player.onAir')}
              </span>
            )}
            {isLive && stats && (
              <span className="flex items-center gap-2 text-[11px] tabular-nums text-white/90 bg-black/40 backdrop-blur rounded-full px-2.5 py-1 shrink-0">
                <span title={t('player.speedTip')}>↓ {stats.mbps.toFixed(1)} Mbps</span>
                <span className="text-white/30">·</span>
                <span title={t('player.bufferTip')} className={stats.buffer < 1 ? 'text-red-300' : stats.buffer < 2.5 ? 'text-amber-300' : 'text-emerald-300'}>
                  {t('player.bufferLabel', { seconds: stats.buffer.toFixed(1) })}
                </span>
                {stats.dropped > 0 && <><span className="text-white/30">·</span><span className="text-white/60" title={t('player.dropsTip')}>{t('player.drops', { count: stats.dropped })}</span></>}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate drop-shadow">{item.name}</div>
            </div>
            {isLive && (
              <div className="flex items-center gap-0.5 bg-black/40 backdrop-blur rounded-full p-0.5 shrink-0" title={t('player.cacheTip')}>
                <button
                  onClick={toggleAuto}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition ${auto ? 'bg-accent text-white font-semibold' : 'text-white/70 hover:text-white'}`}
                >
                  {t('player.auto')}
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
                      {bufferLabel(key)}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={onClose}
              title={t('player.close')}
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
