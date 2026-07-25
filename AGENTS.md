# AGENTS.md — IPTV Freedom

Working rules for any agent (or human) contributing to this repository. These
rules are mandatory and override individual preferences.

## Project

IPTV Freedom is an Electron desktop IPTV client (Xtream Codes protocol):
multiple accounts, Live / Movies / Series browsing and search, a built-in
player (mpegts.js for live, native `<video>` for VOD), VOD downloads with
resume + queue, favorites, and 20-language UI with full RTL support.

The stack and visual language follow [pingdotgg/t3code](https://github.com/pingdotgg/t3code):
pnpm monorepo, TypeScript, Vite (via electron-vite), React, Tailwind CSS v4
(CSS-first `@theme` / `@variant dark`), shadcn-style UI primitives, and t3code's
design tokens (zinc neutrals + violet primary, light + dark).

## Rules

### 1. English everywhere in the codebase

All code, function and variable names, documentation, comments, commit messages,
branch names, and Git workflow are written in **English** — no exceptions.

The only exception is user-facing **i18n locale data** under
`apps/desktop/src/renderer/src/i18n/locales/*.json`: those are translation
_content_, not code, and are intentionally multilingual.

### 2. Commit + push after every change

Every code change is **committed and pushed immediately**. Do not batch multiple
unrelated changes into one commit, and never leave finished work uncommitted or
unpushed. Use clear, conventional English commit messages
(e.g. `feat(ui): …`, `fix(player): …`, `chore(build): …`).

### 3. GitHub Actions stays release-only

The repository has exactly one workflow: `.github/workflows/release.yml`. It
builds and publishes on `v*` tags — Windows (NSIS) / macOS (DMG) / Linux
(AppImage), x64 + arm64 — and creates a GitHub Release.

When touching CI, **preserve this build/release flow** and adapt it only as
needed (e.g. tooling changes). **Do not add** any other workflow — no lint,
test, PR-check, or scheduled workflows. Linting, formatting and type-checking
run locally (`vp check` / `pnpm typecheck`), not in CI.

## Layout

```
apps/desktop/        Electron app (main + preload + renderer) built with electron-vite
packages/contracts/  TypeScript types for the window.api IPC surface
packages/core/       Shared domain logic (Xtream client, formatters, catalog, favorites)
packages/ui/         Tailwind v4 theme tokens + shadcn-style UI primitives
```

## Toolchain

The workspace uses [Vite+](https://vite.plus) (`vp`) as the unified toolchain
(rolldown-vite, oxlint, oxfmt), on top of pnpm workspaces. Install `vp` once:
`curl -fsSL https://vite.plus | bash`. The Electron app itself is still built by
`electron-vite` (which resolves Vite to `vite-plus-core` via the pnpm catalog).

## Commands

```
vp i             # install the workspace (pnpm install also works)
vp run dev       # run the app (electron-vite dev)
vp run build     # build main/preload/renderer
vp run dist      # local installer via electron-builder
vp check         # format + lint + type-check (oxfmt + oxlint + tsc)
vp fmt           # format only (oxfmt); vp fmt --check to verify
vp lint          # lint only (oxlint)
pnpm typecheck   # tsc --noEmit across the workspace
pnpm clean       # remove node_modules, build output and caches
```
