// i18n layer (react-i18next). Supported languages: the 20 most spoken worldwide.
// pt-BR is the source of the keys; en is the fallback.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zh from "./locales/zh.json";
import hi from "./locales/hi.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import bn from "./locales/bn.json";
import ru from "./locales/ru.json";
import ptBR from "./locales/pt-BR.json";
import ur from "./locales/ur.json";
import id from "./locales/id.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import mr from "./locales/mr.json";
import te from "./locales/te.json";
import tr from "./locales/tr.json";
import ta from "./locales/ta.json";
import vi from "./locales/vi.json";
import wuu from "./locales/wuu.json";
import ko from "./locales/ko.json";

export interface Language {
  code: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

// Rough order by number of speakers. `dir` controls RTL.
export const LANGUAGES: Language[] = [
  { code: "en", nativeName: "English", dir: "ltr" },
  { code: "zh", nativeName: "中文", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "es", nativeName: "Español", dir: "ltr" },
  { code: "fr", nativeName: "Français", dir: "ltr" },
  { code: "ar", nativeName: "العربية", dir: "rtl" },
  { code: "bn", nativeName: "বাংলা", dir: "ltr" },
  { code: "ru", nativeName: "Русский", dir: "ltr" },
  { code: "pt-BR", nativeName: "Português (Brasil)", dir: "ltr" },
  { code: "ur", nativeName: "اردو", dir: "rtl" },
  { code: "id", nativeName: "Bahasa Indonesia", dir: "ltr" },
  { code: "de", nativeName: "Deutsch", dir: "ltr" },
  { code: "ja", nativeName: "日本語", dir: "ltr" },
  { code: "mr", nativeName: "मराठी", dir: "ltr" },
  { code: "te", nativeName: "తెలుగు", dir: "ltr" },
  { code: "tr", nativeName: "Türkçe", dir: "ltr" },
  { code: "ta", nativeName: "தமிழ்", dir: "ltr" },
  { code: "vi", nativeName: "Tiếng Việt", dir: "ltr" },
  { code: "wuu", nativeName: "吴语", dir: "ltr" },
  { code: "ko", nativeName: "한국어", dir: "ltr" },
];

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  bn: { translation: bn },
  ru: { translation: ru },
  "pt-BR": { translation: ptBR },
  ur: { translation: ur },
  id: { translation: id },
  de: { translation: de },
  ja: { translation: ja },
  mr: { translation: mr },
  te: { translation: te },
  tr: { translation: tr },
  ta: { translation: ta },
  vi: { translation: vi },
  wuu: { translation: wuu },
  ko: { translation: ko },
};

const LANG_KEY = "iptvfreedom.lang";
const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));

// Detects the initial language: saved choice -> OS language -> English.
function detectLanguage(): string {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED.has(saved)) return saved;
  } catch {
    /* localStorage unavailable */
  }
  const navs =
    (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const l of navs) {
    if (!l) continue;
    if (SUPPORTED.has(l)) return l;
    const base = l.split("-")[0].toLowerCase();
    if (base === "pt") return "pt-BR";
    if (SUPPORTED.has(base)) return base;
  }
  return "en";
}

function applyDir(code: string): void {
  const lang = LANGUAGES.find((l) => l.code === code);
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
    document.documentElement.dir = lang?.dir || "ltr";
  }
}

const initial = detectLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

applyDir(initial);

// Switches the language at runtime: updates i18next, persists it, and adjusts direction (RTL/LTR).
export function setLanguage(code: string): void {
  if (!SUPPORTED.has(code)) return;
  i18n.changeLanguage(code);
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    /* noop */
  }
  applyDir(code);
}

export default i18n;
