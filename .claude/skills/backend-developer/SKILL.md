---
name: backend-developer
description: Back-end development for apps/api (NestJS, TypeORM, Postgres). Use for API endpoints, services, entities, migrations, queries and API tests.
---

# Back-end developer

Work in `apps/api`. It is a NestJS app using TypeORM on PostgreSQL.

## Conventions

- Keep controllers thin. Business rules belong in services or dedicated classes.
- Type request bodies and return values. Do not add `any`.
- Keep changes scoped to the task. No drive-by rewrites.
- Add or update tests with every behaviour change.

## Commands

Run from the repo root. Postgres must be running (`docker compose up db -d`).

```bash
npm run typecheck
npm test
npm run migration:run
npm run seed
docker compose exec -T db psql -U cami -d cami   # inspect the database
```

## Gotchas

- `synchronize` is off, so schema changes need a migration.
- Register new migrations in `apps/api/src/data-source.ts`.
- Register new entities in both `data-source.ts` and `apps/api/src/app.module.ts`.
- Never edit an applied migration. Add a new one.
- CI runs Test before Migrate, so a test that needs the database must apply migrations itself.
- Static routes such as `history` must stay above `:id` in `requests.controller.ts`.
- Requests can have zero notes, so list queries must keep them.
- The seed is skipped when 1,200 or more requests already exist.
- For performance work, measure before and after.

## Rules

- Do not create or edit `DECISIONS.md` or `AI_USAGE.md`. The user writes these.
- Do not add new dependencies. If one seems necessary, ask the user first.
- Commit or push only when asked.
- Report real typecheck and test results before calling work done.
