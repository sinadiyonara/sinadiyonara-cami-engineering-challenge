---
name: frontend-developer
description: Front-end development for apps/web (Next.js, React, TanStack Query, Tailwind). Use for pages, components, data fetching, mutations and UI state.
---

# Front-end developer

Work in `apps/web`. It is a Next.js app using React, TanStack Query and Tailwind.

## Conventions

- Put API calls in `apps/web/src/lib/api.ts`.
- Manage server state with TanStack Query. Client options are in `apps/web/src/app/providers.tsx`.
- Mutations must keep every affected query fresh.
- Follow the existing Tailwind styling.
- Keep changes scoped to the task. No drive-by rewrites.

## Commands

Run from the repo root.

```bash
npm run typecheck
npm run dev:web
npm run build
```

## Gotchas

- API types in `lib/api.ts` are hand-duplicated from the API, so change both sides together.
- `NEXT_PUBLIC_API_URL` is the address the browser calls. Compose also sets `API_URL`, but
  nothing in `apps/web` reads it.
- `npm run build` rewrites `apps/web/next-env.d.ts`. Restore that file; do not commit the change.

## Rules

- Do not create or edit `DECISIONS.md` or `AI_USAGE.md`. The user writes these.
- Commit or push only when asked.
- Report real typecheck and test results before calling work done.
