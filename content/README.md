# Repo-backed content

Vault data lives in Git — not a separate database.

| File | Purpose | Who edits |
|------|---------|-----------|
| `game.json` | Mine costs, d6 table | DM via PR (rebuild to apply) |
| `site.json` | Labels and flavor copy | DM via PR (rebuild to apply) |
| `ledger.json` | Live campaign treasury + history | **App only** (autosave) |
| `moon-tracker.json` | Harptos dates — campaign start, today, infection | **App only** (autosave) |

## Ledger rules

The ledger is **append-only** in the app:

- **Create** — roll a week, infuse capital, pay startup
- **Re-roll** — Reroll on the **current week** row only (fresh d6, replaces that line)
- **Void** — strike a mistaken entry (treasury recalculated)
- **No hand-edit** — altering figures directly is Cooking the Books

Do not hand-edit `ledger.json` in Git. Use the vault UI or void and re-enter.

Same for `moon-tracker.json` — set dates in Moon Tracker; autosave writes here.

Set `GITHUB_TOKEN` + `GITHUB_REPO` on Render so autosaves commit here. Without them, the server writes `content/ledger.json` and `content/moon-tracker.json` on disk (ephemeral on free Render).

**Note:** `ledger.json` and `moon-tracker.json` contain campaign state. Use a **private** repo if you do not want treasury data public.
