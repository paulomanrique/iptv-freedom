// Pure formatting helpers (no i18n / DOM coupling) shared across the app.

export function formatBytes(n: number): string {
  if (!n || n < 0) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec) return "";
  return `${formatBytes(bytesPerSec)}/s`;
}

// "Smart" title case: capitalizes words, keeps connectors lowercase, preserves
// known acronyms and tokens containing a number (18+, 2022, 1080p).
const SMALL_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "com",
  "para",
  "na",
  "no",
  "nas",
  "nos",
  "em",
  "di",
  "del",
  "la",
  "le",
  "of",
  "the",
  "and",
]);
const ACRONYMS = new Set([
  // quality / format
  "DC",
  "HD",
  "SD",
  "FHD",
  "UHD",
  "4K",
  "8K",
  "3D",
  "HQ",
  "VOD",
  "PPV",
  "XXX",
  // countries / sports / misc
  "TV",
  "BR",
  "EUA",
  "US",
  "UK",
  "NBA",
  "NFL",
  "MLB",
  "NHL",
  "UFC",
  "WWE",
  "MMA",
  "F1",
  "BBB",
  "KIDS",
  // common channels
  "HBO",
  "HBO2",
  "MAX",
  "ESPN",
  "TNT",
  "SBT",
  "AXN",
  "FOX",
  "FX",
  "FXX",
  "GNT",
  "AMC",
  "MTV",
  "CNN",
  "BBC",
  "TLC",
  "NGC",
  "USA",
  "CBS",
  "NBC",
  "ABC",
  "CW",
  "TBS",
  "TCM",
  "SYFY",
  "AE",
  "NHK",
  "RAI",
  "RT",
  "DW",
]);

function capWord(w: string): string {
  return w
    .split("-")
    .map((seg) => (seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : seg))
    .join("-");
}

// Normalizes text for search: strips accents and case ("Pânico" -> "panico").
export function normalizeSearch(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function smartTitleCase(str: string): string {
  const clean = String(str || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!clean) return clean;
  const words = clean.split(" ");
  return words
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (/\d/.test(w)) return w; // 18+, 2022, 1080p, 007 — keep as provided
      if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
      return capWord(w);
    })
    .join(" ");
}
