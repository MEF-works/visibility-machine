# Visibility Machine

**An operator-focused build-in-public control plane for turning engineering work into proof, reusable content, launches, leads, and measurable follow-up.**

Visibility Machine is a full-stack application that captures what was built, attaches evidence, generates platform-specific drafts, schedules distribution, tracks launch activity, records leads, and measures whether visibility work produced anything useful.

The interesting part is not social posting. It is the **workflow between engineering output and public proof**.

## What it demonstrates

- **Full-stack TypeScript application** — React/Vite frontend with an Express API bundled for production.
- **Structured build logs** — captures what changed, why it matters, the pain point, proof, status, and intended outcome.
- **Proof-aware generation** — AI drafts are grounded in attached evidence and are instructed not to invent missing facts.
- **Offline-capable behavior** — the application can generate deterministic template drafts when Gemini is not configured.
- **Artifact handling** — proof uploads are stored and linked back to build-log records.
- **Launch operations** — launch campaigns, checklists, scheduled dispatches, platform profiles, and lead tracking share one state model.
- **Import / export** — application state can be backed up and restored rather than trapped in one runtime.
- **Operational honesty** — incomplete features are identified as incomplete rather than presented as finished automation.

## Core workflow

```text
engineering work
      ↓
capture build log
      ↓
attach proof / artifacts
      ↓
assess input quality
      ↓
generate platform-specific drafts
      ↓
review + schedule distribution
      ↓
log replies / leads / outcomes
      ↓
reuse what worked
```

## Product surfaces

| Area | Purpose |
| --- | --- |
| **Command** | visibility dashboard, activity, launch and outcome metrics |
| **Capture** | build logs and proof artifacts |
| **Distribute** | draft generation, dispatch calendar, reuse library |
| **Launch & Grow** | launch campaigns, lead tracking, growth metrics, angle analysis |
| **Settings / Backup** | configuration plus import/export of application state |

## Architecture

```text
React / Vite UI
      │
      ▼
Express application server
      │
      ├── build-log API
      ├── proof / upload API
      ├── drafts + content-quality logic
      ├── launch / dispatch API
      ├── leads + platform profiles
      └── metrics / settings / backup
                  │
                  ├── local application storage
                  └── optional Gemini client
```

AI is optional. `GEMINI_API_KEY` enables live generation; without it, the application remains usable with offline draft logic.

## Proof-first generation

The generation layer deliberately treats evidence as part of the input contract. Drafts are expected to reference concrete information from the build log or attached proof rather than generating generic "we shipped something" copy.

The server also scores the strength of the source material before generation. Thin input is surfaced as thin input instead of being silently padded with invented claims.

That pattern is useful beyond content tooling: **AI output becomes more trustworthy when provenance and missing evidence are modeled explicitly.**

## Run locally

### Requirements

- Node.js 18+
- npm
- optional Gemini API key

```bash
git clone https://github.com/MEF-works/visibility-machine.git
cd visibility-machine
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

Optional:

```env
GEMINI_API_KEY=your_key_here
```

Without a Gemini key, the app runs in offline/template mode.

## Build and run

```bash
npm run build
npm start
```

The production build compiles the Vite frontend and bundles the Express server.

## Current capability boundary

| Capability | Status |
| --- | --- |
| Build logs and proof records | Implemented |
| File upload | Implemented |
| Launch campaigns and checklists | Implemented |
| Scheduled dispatch records | Implemented |
| Lead tracking | Implemented |
| Gemini-assisted drafts and angle analysis | Implemented when configured |
| Offline template drafts | Implemented |
| State backup / restore | Implemented |
| Automatic posting to external social APIs | Not implemented |
| Final rendered video export from Clip Builder | Not implemented |

## Engineering notes

A few deliberate choices shape the project:

- **evidence before copy** — proof is part of the workflow, not an afterthought
- **one operational model** — build, launch, distribution, leads, and metrics stay connected
- **AI as an optional capability** — the core product does not collapse when the model API is unavailable
- **explicit limits** — placeholder and manual steps remain labeled instead of being disguised as automation

## Stack

- React 19
- TypeScript
- Vite
- Express
- Multer
- Google Gemini API, optional
- Tailwind CSS
- Motion

Built by [MEF-works](https://github.com/MEF-works).
