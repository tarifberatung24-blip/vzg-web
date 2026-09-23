<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Repository facts

- Stack: TanStack Start (file-based routing) + React 19 + Vite + Nitro, TypeScript
  strict, Supabase (Lovable Cloud) for auth and data.
- Package manager: `bun` is used by Lovable (`bun.lock`); `npm` also works for local
  verification.
- Database structure is managed **outside** this repository. `drizzle/schema.ts` is
  intentionally blank and there are no `.sql` files. RLS policies, triggers, and column
  defaults are not visible in the repo — do not assume they exist.
- Only `profiles` and `analyses` exist today. Every other table (`organizations`,
  `credit_transactions`, `customer_reports`, `internal_*`, …) must be created by a
  migration.
- Never use `user_metadata` for authorization decisions — it is client-writable.
  Roles belong in `app_metadata` (server-set) or a service-role-only table.
- `src/integrations/supabase/client.server.ts` holds the service-role client. It may only
  be imported from `*.server.ts` modules — never from a route file or `*.functions.ts`,
  which are shipped to the client bundle.
- Billing fields on `analyses` (`billing_kind`, `payment_status`, `amount_cents`, `status`)
  must stay server-only. Customer-visible output and internal VZG output live in separate
  tables with separate authorization; hiding fields in the frontend is not sufficient.

## Commands

- `npm install` — install dependencies
- `npx tsc --noEmit` — typecheck (currently clean)
- `npm run build` — production build (currently succeeds)
- `npm run lint` — **currently fails**: 371 Prettier formatting errors plus one
  `prefer-const` in generated `previewAuthStorage.ts`. Run `npm run format` before
  touching formatting, and coordinate the generated-file fix with Lovable.
- `npm run dev` — local dev server

## Before implementing Project Intelligence

Read, in order:

1. `docs/CURRENT_STATE_AUDIT.md` — verified state of what exists today
2. `docs/PROJECT_INT_ARCHITECTURE.md` — locked architecture
3. `docs/PROJECT_INT_DATA_MODEL.md` — proposed schema and migration order
4. `docs/PROJECT_INT_SECURITY.md` — threat model and required mitigations
5. `docs/PROJECT_INT_BUILD_PLAN.md` — the ordered task list (TASK-001 … TASK-022)

Do not start implementation work before confirming the RLS policies on `profiles` and
`analyses` inside the Supabase dashboard; several high-severity findings cannot be closed
from code alone.
