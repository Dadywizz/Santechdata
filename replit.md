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
- `artifacts/api-server/src/lib/providers/` — provider integrations: BigISub, KYB Data, EasyAccess (electricity only), and payment gateways
- `artifacts/santech-data/src/pages/` — all customer and admin pages
- `artifacts/santech-data/src/components/` — shared UI components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval → typed React Query hooks + Zod validators. Never handwrite fetch calls.
- JWT auth stored as `santech_token` / `santech_user` in localStorage; `setAuthTokenGetter` wired in `main.tsx`.
- VTU service calls (airtime, data, cable, exam) route through BigISub/KYB Data; electricity routes through whichever provider is set in `elec_provider` (KYB, BigISub, or EasyAccess) via the provider layer in `lib/providers/`.
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
- VTU provider: **BigISub** (bigisub.ng) — primary provider for data/airtime/cable/exam. KYB Data also available.
- **Electricity provider: EasyAccess** (easyaccess.com.ng) — explicitly requested to handle electricity purchases specifically (overrides the general "do not use EasyAccess" guidance below, which still applies to other services).
- DO NOT use VTpass, Clubkonnect, or Nellobyte. Do not use EasyAccess for anything other than electricity without asking first.

## Provider Setup

- **BigISub** — token loaded from `bigisub_api_token` DB setting (set via Admin → Settings) or `BIGISUB_API_TOKEN` env var. Shown first in Settings UI.
- **KYB Data** — token loaded from `kybdata_api_token` DB setting (set via Admin → Settings) or `KYBDATA_API_TOKEN` env var. Admin can update via the Settings page without restarting the server.
- **EasyAccess** — token loaded from `easyaccess_api_token` DB setting (set via Admin → Settings) or `EASYACCESS_API_TOKEN` env var. Electricity-only; toggle which provider handles electricity via Admin → Settings → Provider Routing → Electricity (`elec_provider` setting). Dev and production have separate databases, so this setting must be applied separately in each environment's Admin → Settings after deploying.
- **Aspfiy** — dedicated virtual account gateway (Paga/PalmPay). Key stored in `ASPFIY_SECRET_KEY` env secret. Users generate their Aspfiy account from the Fund Wallet → Bank Transfer tab (no BVN/NIN required). Accounts stored in `aspfiy_account_number`/`aspfiy_account_bank` wallet columns. Webhook: `POST /api/wallet/webhook/aspfiy` (configure this URL in your Aspfiy merchant dashboard). Reference format used: `aspfiy-<userId>`.

## Exam Pricing

- Exam types (WAEC, NECO, JAMB, NABTEB) each have `price` + `costPrice` in `exam_types`, editable by admin at `/admin/exams`.
- `POST /admin/seed-exam-types` upserts all 4 exam codes with default pricing on first insert; re-running it only refreshes `name`/`description`, never overwrites admin-set `price`/`costPrice`.
- `PATCH /admin/exams/:id` updates name/price/costPrice/description for a single exam type (admin-only).
- Public `/exam/types` GET intentionally omits `costPrice` to avoid exposing margin to customers.

## Reseller Programme

- Customers pay ₦500 one-time to become resellers (deducted from wallet)
- Resellers get wholesale prices (`resellerPrice` column on `data_plans`)
- If a plan has no `resellerPrice` set, resellers pay the regular price
- Admin manages resellers at `/admin/resellers` (suspend, activate, revoke)
- Customer upgrade page: `/become-reseller`

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
- Provider integrations: `artifacts/api-server/src/lib/providers/`
  - `bigisub.ts` — BigISub API (data, airtime, electricity, cable, exam) — primary provider
  - `kybdata.ts` — KYB Data API (alternate provider, incl. default electricity)
  - `easyaccess.ts` — EasyAccess API (electricity only)
  - `activeProvider.ts` — routes each service call to the currently configured provider, with a dedicated electricity override
  - `gateways.ts` — Paystack, Flutterwave, Monnify payment initiation + verification
  - `vtpass.ts` / `clubkonnect.ts` — legacy stubs, not in use (see "User preferences")
