# IPTV Freedom

Cliente IPTV desktop em **Electron + React + Tailwind CSS** para provedores no padrão **Xtream Codes**.

## Funcionalidades

- 📺 Cadastro de múltiplas contas IPTV (host · usuário · senha)
- 🔎 Navegação e busca de conteúdo (ao vivo, filmes, séries)
- ▶️ Player embutido — ao vivo via `mpegts.js` (MPEG-TS/MSE), VOD `.mp4` via `<video>` nativo
- ⬇️ Download de conteúdo VOD (filmes e séries), com retomada e fila respeitando o limite de conexões do provedor

## Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) 19
- [Tailwind CSS](https://tailwindcss.com/) v3
- [mpegts.js](https://github.com/xqq/mpegts.js) para streams MPEG-TS

## Desenvolvimento

```bash
npm install
npm run dev      # inicia o app com hot reload
npm run build    # build de produção
```

> O design da interface segue um estilo macOS (vibrancy, cantos arredondados, layout compacto de 3 painéis estilo Finder). Os 5 estudos de layout iniciais estão em `mockups/`.

## Estrutura

```
src/
  main/        processo principal (janela, IPC, rede, disco)
  preload/     ponte segura (contextBridge) para o renderer
  renderer/    UI em React + Tailwind
```
