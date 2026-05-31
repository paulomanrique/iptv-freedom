// Dados de exemplo para a fase de UI. Serão substituídos pelos dados reais
// vindos do cliente Xtream (player_api.php) nas próximas fases.

export const PAL = [
  ['#7b4dff', '#3a1d8a'], ['#ff5f6d', '#7a1f3d'], ['#11998e', '#0a4a47'],
  ['#f7971e', '#7a4a0a'], ['#2193b0', '#0a3a4a'], ['#cc2b5e', '#5a1230'],
  ['#42275a', '#1a0f2a'], ['#005c97', '#0a2a4a'], ['#dd5e89', '#5a2540'],
  ['#1f4037', '#0a201a']
]

export const gradient = (i) => {
  const [a, b] = PAL[i % PAL.length]
  return `linear-gradient(150deg, ${a}, ${b})`
}

export const MOVIES = [
  { t: 'De Férias com Você', y: 2026, g: 'Comédia', d: '1h52', q: 'HD', sz: '1.4 GB' },
  { t: 'Dinheiro Suspeito', y: 2026, g: 'Crime', d: '2h08', q: '4K', sz: '3.1 GB' },
  { t: 'Caju, Meu Amigo', y: 2026, g: 'Família', d: '1h38', q: 'HD', sz: '1.2 GB' },
  { t: 'O Falsário', y: 2026, g: 'Suspense', d: '2h11', q: '4K', sz: '2.1 GB' },
  { t: 'Verdade e Traição', y: 2026, g: 'Drama', d: '1h59', q: '1080p', sz: '1.8 GB' },
  { t: 'Um Dia Extraordinário', y: 2026, g: 'Drama', d: '1h44', q: 'HD', sz: '1.3 GB' },
  { t: 'Davi: Nasce Um Rei', y: 2026, g: 'Épico', d: '2h14', q: '4K', sz: '3.4 GB' },
  { t: 'Dupla Perigosa', y: 2026, g: 'Ação', d: '1h57', q: '4K', sz: '1.7 GB' },
  { t: 'Cidade em Chamas', y: 2025, g: 'Ação', d: '2h03', q: '4K', sz: '2.4 GB' },
  { t: 'Protocolo Zero', y: 2025, g: 'Ficção', d: '2h20', q: '4K', sz: '3.0 GB' },
  { t: 'Noite Sem Fim', y: 2025, g: 'Terror', d: '1h41', q: 'HD', sz: '1.1 GB' },
  { t: 'Vingança Fria', y: 2024, g: 'Ação', d: '1h49', q: '1080p', sz: '1.6 GB' }
]

export const SERIES = [
  { t: 'The Crown', y: 2024, g: 'Drama', d: '6 temporadas', q: '4K' },
  { t: 'Ruptura', y: 2025, g: 'Ficção', d: '2 temporadas', q: '4K' },
  { t: 'O Urso', y: 2025, g: 'Comédia', d: '3 temporadas', q: 'HD' },
  { t: 'Round 6', y: 2025, g: 'Suspense', d: '3 temporadas', q: '4K' },
  { t: 'Dark', y: 2020, g: 'Ficção', d: '3 temporadas', q: 'HD' },
  { t: 'The Last of Us', y: 2025, g: 'Drama', d: '2 temporadas', q: '4K' }
]

export const LIVE = [
  'Globo HD', 'SporTV 2', 'Telecine Action', 'HBO Max 24h', 'ESPN Brasil',
  'Premiere Clubes', 'Discovery', 'GloboNews', 'Cartoon Network', 'Band Sports',
  'TNT', 'Megapix'
]

export const CATEGORIES = [
  'Lançamentos 2026', 'Ação', 'Marvel e DC', 'Cinema', 'Terror & Suspense', 'Comédia', 'Ficção'
]

export const DOWNLOADS = [
  { t: 'O Falsário (2026)', meta: 'mp4 · 2.1 GB', pct: 62, status: '8,4 MB/s', state: 'downloading' },
  { t: 'Dupla Perigosa (2026)', meta: 'mp4 · 1.7 GB', pct: 0, status: 'Na fila', state: 'queued' },
  { t: 'Round 6 · S03E01', meta: 'mkv · 780 MB', pct: 100, status: 'Concluído', state: 'done' },
  { t: 'Cidade em Chamas (2025)', meta: 'mp4 · 2.4 GB', pct: 100, status: 'Concluído', state: 'done' }
]

export const ACCOUNT = {
  host: 'a1a12.com',
  username: '166123265',
  status: 'Ativa',
  exp: '24/06/2026',
  connections: '1 / 1',
  format: 'TS'
}
