# SanTech Data

A full-featured VTU (Virtual Top-Up) self-service web app for purchasing data bundles, airtime, electricity tokens, cable TV subscriptions, and exam tokens — with integrated wallet funding, referrals, notifications, and support.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080/`/api`)
- `pnpm --filter @workspace/santech-data run dev` — run the frontend (port 25225/`/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + shadcn/ui + Tailwind CSS
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Charts: recharts (admin analytics)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API types
- `lib/api-zod/` — generated Zod schemas
- `lib/api-client-react/` — generated React Query hooks
- `lib/db/` — Drizzle schema (`users`, `wallets`, `transactions`, `data_plans`, `exam_types`, `notifications`, `referrals`, `tickets`, `ticket_messages`)
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/lib/providers/` — integration stubs for VTpass, Clubkonnect, and payment gateways
- `artifacts/santech-data/src/pages/` — all customer and admin pages
- `artifacts/santech-data/src/components/` — shared UI components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval → typed React Query hooks + Zod validators. Never handwrite fetch calls.
- JWT auth stored as `santech_token` / `santech_user` in localStorage; `setAuthTokenGetter` wired in `main.tsx`.
- All VTU service calls (airtime, data, electricity, cable, exam) are stubbed to work in dev mode. Swap the stubs in `services.ts` for real VTpass/Clubkonnect calls using the provider layer in `lib/providers/`.
- Payment gateway initiation returns a `paymentUrl` for redirect; verification is simulated in dev mode. Wire `gateways.ts` for production.
- Admin seeded on first `db push` (see `lib/db/seed.ts`): `admin@santechdata.ng` / `Admin@123456`.

## Product

- **Customer**: Dashboard, Buy Data/Airtime/Electricity/Cable/Exam, Fund Wallet, Transactions, Referrals, Notifications, Support, Profile
- **Admin**: Dashboard stats, User management, Transaction history, Data plan pricing, Ticket management, Analytics with charts, Broadcast notifications
- **Export**: CSV download of all transactions from admin transactions & analytics pages

## User preferences

- Contact number for support: 09026329296
- Services: data, airtime, electricity, cable TV (DStv/GOtv/StarTimes), exam tokens (WAEC/NECO/JAMB/NABTEB)
- Payment gateways: Paystack, Flutterwave, Monnify
- VTU provider: **KYB Data only** (kybdatassub.com.ng) — handles ALL services: airtime, data, electricity, cable TV, exam pins
- DO NOT use VTpass, EasyAccess, Clubkonnect, or Nellobyte

## Provider Setup

- **KYB Data** — token loaded from `kybdata_api_token` DB setting (set via Admin → Settings) or `KYBDATA_API_TOKEN` env var. Admin can update via the Settings page without restarting the server.

## Gotchas

- Do not run `pnpm dev` at workspace root — use workflows or `pnpm --filter` per package.
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after any `openapi.yaml` change.
- `pnpm --filter @workspace/db run push` must be re-run after any schema change in `lib/db/`.
- Enum values in generated hooks (e.g. `FundingInputGateway`, `AirtimePurchaseInputNetwork`) require `as any` or precise enum casts — use `as any` for simplicity.
- `useGetNotifications` first param is optional `GetNotificationsParams`; second is options object.
- `useGetTicket` takes `id: string` as first positional arg, NOT an object `{ id }`.
- `useMarkAllNotificationsRead` `mutate()` takes no argument (void).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Provider integration stubs: `artifacts/api-server/src/lib/providers/`
  - `vtpass.ts` — VTpass API (data, airtime, electricity, cable, exam)
  - `clubkonnect.ts` — Clubkonnect API (data, airtime, exam pins)
  - `gateways.ts` — Paystack, Flutterwave, Monnify payment initiation + verification
