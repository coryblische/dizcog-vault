# Cogspanner & Co., Inc. — Weekly Ledger

Fantasy steampunk sim for D&D gold mine weekly income. Roll d6 per DM table, subtract operating costs, track treasury.

## Run locally

```bash
npm install
cp .env.example .env   # if you don't already have .env
npm run dev
```

Open **http://localhost:8888** — Node server runs API + proxies Vite for hot reload.

UI-only without API: `npm run dev:vite` → http://localhost:5173 (login won't work).

Production-like local run:

```bash
npm run build
npm start
```

## Deploy (no Netlify required)

The app is a static Vite build plus a small Node server (`server/`) for auth and ledger storage.

**Content model:** like Outstatic — data lives in the Git repo under `content/`. Outstatic itself is Next.js-only; this app uses the same pattern via JSON files + GitHub API commits.

### Option A — Render (free tier)

1. Push repo to GitHub.
2. [render.com](https://render.com) → **New Blueprint** → connect repo (`render.yaml` included).
3. Set `LEDGER_PASSWORD` when prompted.
4. Render mounts a persistent disk at `/data` for the ledger.

### Option B — Docker (Fly.io, VPS, homelab)

```bash
npm run build
docker build -t cogspanner-ledger .
docker run -p 3000:3000 \
  -e LEDGER_PASSWORD=forkarl \
  -e LEDGER_AUTH_SECRET="$(openssl rand -hex 32)" \
  -v cogspanner-data:/data \
  cogspanner-ledger
```

### Option C — Any Node host

```bash
npm install
npm run build
LEDGER_PASSWORD=forkarl LEDGER_AUTH_SECRET=... DATA_DIR=./data npm start
```

Set `PORT` if needed (default `8888` locally, use `3000` on most hosts).

### Migrate ledger off Netlify

If you have a local Netlify Blobs export:

```bash
node scripts/import-netlify-blob.mjs ".netlify/blobs-serve/entries/.../site:cogspanner-ledger/main"
```

Copy `data/main.json` to the new host's `DATA_DIR`.

### Legacy Netlify deploy

Still works via `npm run dev:netlify` + `netlify deploy`, but requires Netlify credits.

## Persistence & auth

- Password gate on load; ledger autosaves after each change.
- **Repo-backed content** in `content/` (see `content/README.md`):
  - `game.json` / `site.json` — DM-editable config and copy (rebuild to apply).
  - `ledger.json` — live campaign state.
- With `GITHUB_TOKEN` + `GITHUB_REPO`, autosaves **commit to GitHub** (~15s debounce). Survives Render free tier restarts.
- Without GitHub env vars, ledger writes to local `content/ledger.json` (ephemeral on free Render).
- Password checked server-side; session stored in httpOnly cookie.

### GitHub token for Render

1. GitHub → Settings → Developer settings → Fine-grained token
2. Repo access: `coryblische/dizcog-vault`
3. Permissions: **Contents** read + write
4. Set as `GITHUB_TOKEN` on Render

**Use a private repo** if you do not want `ledger.json` treasury data public on GitHub.

## Vault PIN reference image

The login pinpad uses Dethek runes (no labels). PIN must match `LEDGER_PASSWORD` in `.env` (see `src/runes.ts`).

Generate a private reference card locally (not committed):

```bash
pip install pillow
python3 scripts/generate-pincode-image.py
```

Writes `public/vault-pincode.png` — sequence, rune glyphs, and button names for the DM. File is gitignored; keep it offline.

## Mechanics

| d6 | Outcome | Gross profit |
|----|---------|--------------|
| 1 | Disaster | 50–175 gp loss (cave-in) |
| 2 | Poor | 25 gp |
| 3 | Average | 75 gp |
| 4 | Good | 150 gp |
| 5 | Excellent | 300+ gp (300 + d6×50) |
| 6 | Rich Vein | Special event (variable bonus) |

Weekly net = gross profit − weekly operating costs (payroll + supplies).

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + Node HTTP server

## Fonts & attribution

| Font | Use | Source |
|------|-----|--------|
| **Dethek** | Vault pinpad runes, pincode reference image | Neale Davidson ([Pixel Sagas](https://www.pixelsagas.com/)) — bundled as `public/fonts/Dethek.otf` |
| **Cinzel** | Display headings | [Google Fonts](https://fonts.google.com/specimen/Cinzel) (SIL Open Font License) |
| **Crimson Pro** | Body text | [Google Fonts](https://fonts.google.com/specimen/Crimson+Pro) (SIL Open Font License) |

Dethek maps Latin letters to Forgotten Realms dwarvish glyphs. Also distributed as “Dethek Dwarvish-FR” on font archives (e.g. [fonts2u](https://fonts2u.com/dethek--dwarvish-fr.font), [online-fonts.com](https://online-fonts.com/fonts/dethek)). Copyright © Neale Davidson, 2011–2014. Verify Pixel Sagas / distributor license terms before commercial or public deployment; many mirrors list non-commercial use only.
