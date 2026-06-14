# Visibility Machine

Personal build-in-public command center for launching products, growing awareness, and tracking leads/cash.

**NO BUILD DIES IN PRIVATE.**

## Run locally

```bash
npm install
cp .env.example .env
# Optional: set GEMINI_API_KEY in .env
npm run dev
```

Open http://localhost:3000

## Command Deck

| Section | Views |
|---------|-------|
| **Command** | Visibility Dashboard — metrics, launches, dispatches, activity |
| **Capture** | Build Log, Proof Vault (with file upload), Clip Builder |
| **Distribute** | Post Factory, Dispatch Calendar, Reuse Library |
| **Launch & Grow** | Launch Pad, Money Board, Growth Tracker, Angle Finder |

## Keyboard shortcuts

- `Ctrl+B` — Build Log
- `Ctrl+P` — Post Factory

## Workflow

```
Capture build log → Attach proof → Generate platform drafts → Schedule on calendar
→ Copy & post manually → Log replies/leads → Track cash → Reuse winners
```

### ReUp proof campaign (from mef-story-engine)

Sibling repo `H:\mef-story-engine` holds story evidence (`wp_wc_orders.sql`, `07_CONTENT_ANGLES.md`).

```bash
python scripts/seed-reup-content.py
npm run dev
```

Override story path: `MEF_STORY_ENGINE=H:\mef-story-engine python scripts/seed-reup-content.py`

**Production:** deploy updated `data/visibility-machine.json` or Settings → Import JSON on `visibility.pluginops.pro`.

**GitHub:** [MEF-works/visibility-machine](https://github.com/MEF-works/visibility-machine) — folder on disk is `social-media-super-app`.

Launch Pad adds product launch checklists + AI launch briefs.

## Data

- JSON store: `data/visibility-machine.json`
- Uploads: `data/uploads/`
- Backup: Settings → Export/Import JSON

## Environment

```env
GEMINI_API_KEY=your_key_here
```

Server-side only. Never exposed to the browser.

## What's real vs placeholder

| Feature | Status |
|---------|--------|
| Build logs, proof, drafts, launches, leads, dispatches | **Real** |
| File upload (images/video, 50MB) | **Real** |
| Gemini AI drafts, angle analysis, launch briefs | **Real** with API key; offline templates without |
| Manual follower growth tracking | **Real** — you enter counts |
| Platform playbooks | **Real** — static tactical guides |
| Auto-posting to social APIs | **Not implemented** — copy/paste workflow |
| Clip Builder video export | **Placeholder** — preview/metadata only |

## Scripts

```bash
npm run dev      # Dev server
npm run build    # Production build
npm start        # Run production
npm run lint     # TypeScript check
```

See [TODO.md](TODO.md) for future work.
