// Player (placeholder). Na fase do player real, este componente receberá o
// <video> + mpegts.js (ao vivo .ts) ou <video> nativo (VOD .mp4).
export default function PlayerModal({ item, onClose }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black animate-fadein">
        <div className="relative aspect-video bg-black grid place-items-center">
          <div className="absolute inset-0 poster opacity-40" style={{ background: 'linear-gradient(120deg,#1c3a6b,#3a1d8a)' }} />
          <button className="relative h-16 w-16 rounded-full bg-white/90 text-black grid place-items-center shadow-2xl hover:scale-105 transition">
            <svg className="h-8 w-8 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 grid place-items-center">✕</button>
          <div className="absolute top-3 left-3 text-[11px] bg-black/50 rounded-full px-2.5 py-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            {item.live ? 'mpegts.js · ao vivo' : 'vídeo nativo · VOD'}
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
            <div className="h-1 rounded-full bg-white/25 mb-2"><div className="h-full w-1/3 bg-accent rounded-full" /></div>
            <div className="flex items-center gap-3 text-white/85 text-2xs">
              <span>12:04 / 2:11:33</span>
              <div className="flex-1" />
              <span>{item.t}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
