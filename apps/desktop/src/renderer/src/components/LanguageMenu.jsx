import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../i18n'

// Seletor de idioma (globo) na toolbar. Lista os idiomas pelo nome nativo,
// marca o atual e persiste a escolha via setLanguage (localStorage + dir RTL/LTR).
export default function LanguageMenu() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = i18n.language

  // Fecha ao clicar fora ou ao pressionar Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (code) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        title={t('language.label')}
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/10 transition"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 z-[70] w-44 max-h-80 overflow-y-auto scroll bg-[#1b1e27] border border-white/10 rounded-lg shadow-2xl p-1 animate-fadein">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              dir={l.dir}
              className={`w-full text-start px-3 py-1.5 rounded-md text-2xs flex items-center justify-between gap-2 transition ${
                l.code === current ? 'bg-accent/25 text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="truncate">{l.nativeName}</span>
              {l.code === current && (
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
