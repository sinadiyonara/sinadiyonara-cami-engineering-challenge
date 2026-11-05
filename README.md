# Cami Engineering Challenge

Thanks for taking the time to complete this challenge.

At Cami we hire for practical full-stack judgement: debugging unfamiliar code, improving a
real stack toward its idioms, and shipping an ambiguous feature under time pressure. AI
tools (Cursor, Copilot, Claude Code, ChatGPT, etc.) are **encouraged** — this is an
AI-native role. We care how you use AI, what you correct, and what you reject.

## Timebox

Aim for about **4 hours** on the core tasks. Going further is welcome and helps us assess
lead-level depth; a focused, high-quality core submission is **never penalised** for
stopping. You are not expected to finish everything — prioritise, and document trade-offs
in `DECISIONS.md`. Record AI use in `AI_USAGE.md`.

## What this repo is

A small but realistic full-stack slice:

- **API** — NestJS + TypeORM + PostgreSQL (`apps/api`)
- **Web** — Next.js + React + TanStack Query + Tailwind (`apps/web`)
- **CI** — GitHub Actions (`.github/workflows/ci.yml`)

It boots with seeded customer requests. Several issues are planted on purpose. Your job is
to navigate, prioritise, and improve — not to rebuild the product.

## Quick start (recommended)

Requires Node 20+ and Docker (for Postgres).

```bash
# 1) Start the database
docker compose up db -d

# 2) Install and prepare
npm install
export DATABASE_URL=postgres://cami:cami@localhost:5432/cami   # Windows: set DATABASE_URL=...
npm run migration:run
npm run seed

# 3) Run API + web (two terminals)
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000
- API: http://localhost:3001

One-shot full stack (API + web + DB in Docker) is also supported:

```bash
docker compose up --build
```

## Your tasks

### Core (comparable bar)

1. **List performance** — `GET /requests` is sluggish under seed load. Fix the backend so the
   list stays correct and scales with the seeded notes.
2. **UI freshness** — Changing a request status (or classifying) succeeds in the API, but the
   table often looks stale until refresh. Fix the client behaviour.
3. **CI** — Make the GitHub Actions workflow go green. It fails on a clean checkout of this
   branch today, even though the same commands pass on your machine.
4. **Controller structure** — `POST /requests/classify` packs business rules and loose typing
   into the controller. Refactor toward clearer NestJS layering and types — without a drive-by
   rewrite of the whole app.
5. **Classification history (thin slice)** — Persist classifications (schema + migration),
   expose a filtered list (see `GET /requests/history`), and make `/history` in the web app
   useful. Put the classifier behind a **provider interface** that *could* later be an LLM
   (you do **not** need a real model or API key). Document assumptions in `DECISIONS.md`.

### Stretch (optional — raises ceiling only)

6. **Persistence boundary** — Data access is tightly coupled to TypeORM in the service layer.
   Introduce a clearer repository/port seam where it pays rent.
7. **Deeper history / sequencing** — Richer filter/UI, migration vs deploy ordering notes,
   failure modes for a future LLM provider, or a short stance on team AI workflow standards.

## Submission

Submit a pull request on **your private copy** of this repo (do not PR the central starter).

Include:

- PR summary
- `DECISIONS.md` — assumptions, trade-offs, what you cut and why, prioritisation
- `AI_USAGE.md` — tools used; what AI got wrong / you corrected / rejected
- Tests you added or updated

We will also do a walkthrough of your PR — be ready to explain the diff in your own words.

## What we score

Judgement, correctness, and depth of reasoning — including what you deliberately left
undone. We do **not** score hours spent or how much of the repo you touched.

Note that a green CI run is not the same as a passing submission. The pipeline checks
install, types, tests, and build — it does not verify any of the tasks above. Green CI with
the core tasks unaddressed scores no better than red.
