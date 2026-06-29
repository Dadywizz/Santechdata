---
name: Reseller system
description: Customer upgrade to reseller role for wholesale data pricing
---

## Schema changes
- `users.role` enum: `customer | reseller | admin`
- `users.resellerSince`: timestamp (nullable), set on upgrade
- `data_plans.resellerPrice`: numeric (nullable) — wholesale price; falls back to `price` if null

## API routes
- `GET /api/reseller/status` — returns `{ isReseller, resellerSince, walletBalance }`
- `POST /api/reseller/upgrade` — deducts ₦500 from wallet, sets role to `reseller`
- `GET /api/admin/resellers` — list all reseller accounts with wallet balance + tx count
- `PATCH /api/admin/resellers/:id` — action: `suspend | activate | revoke`
  - revoke: resets role to `customer`, clears `resellerSince`

## Pricing logic (services.ts)
- On data purchase: checks `user.role === "reseller"` and uses `plan.resellerPrice` if not null
- Falls back to `plan.price` if no reseller price set

## Frontend pages
- `/become-reseller` — customer upgrade page with benefits list + sticky CTA; shows balance check
- `/admin/resellers` — admin management page: list, stats, suspend/activate/revoke actions

## Dashboard integration
- Non-resellers see a promotional banner linking to `/become-reseller`
- Active resellers see a green "Reseller Account Active" badge

## Data Plans admin
- PlanForm now includes a Reseller Price field (optional input)
- Reseller price saved via updateMutation/createMutation as `resellerPrice`

**Why:** Users pay ₦500 one-time to unlock wholesale prices, not earn commissions. Reseller price is per-plan, optional — leaving it blank means resellers pay the same as regular customers for that plan.
