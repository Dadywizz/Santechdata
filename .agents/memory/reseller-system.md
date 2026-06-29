---
name: Reseller system
description: Customer upgrade to reseller role for wholesale data pricing + referral commission
---

## Schema changes
- `users.role` enum: `customer | reseller | admin`
- `users.resellerSince`: timestamp (nullable), set on upgrade
- `data_plans.resellerPrice`: numeric (nullable) — wholesale price; falls back to `price` if null
- Transaction type `"commission"` added (application-level, text column — no DB enum constraint)

## API routes
- `GET /api/reseller/status` — returns `{ isReseller, resellerSince, referralCode, walletBalance, upgradeFee, commissionRate }`
- `GET /api/reseller/referrals` — returns commission stats + referred users + recent commissions (resellers only)
- `POST /api/reseller/upgrade` — deducts ₦500 from wallet, sets role to `reseller`
- `GET /api/admin/resellers` — list all reseller accounts with wallet balance + tx count
- `PATCH /api/admin/resellers/:id` — action: `suspend | activate | revoke`
  - revoke: resets role to `customer`, clears `resellerSince`

## Commission system
- Helper `creditResellerCommission(userId, purchaseAmount, desc, log)` in services.ts
- Called via `void creditResellerCommission(...)` after every successful purchase (data, airtime, electricity, cable, exam)
- Looks up `user.referredBy` → checks if referrer is a reseller → credits commission to referrer's wallet
- Commission rate stored in settings table as `resellerCommissionRate` (default "3" = 3%)
- Admin can change the rate via Admin → Settings → Wallet Settings → Reseller Commission Rate

## Pricing logic (services.ts)
- On data purchase: checks `user.role === "reseller"` and uses `plan.resellerPrice` if not null
- Falls back to `plan.price` if no reseller price set

## Frontend pages
- `/become-reseller`:
  - Non-resellers: upgrade page with benefits list, UpgradePage component, **fixed CTA** at `bottom-16` (above mobile bottom nav)
  - Active resellers: full ResellerDashboard — commission stats, referral link + share button, commission history, referred users list
- `/admin/resellers` — admin management page: list, stats, suspend/activate/revoke actions

## Fixed button issue
- `sticky bottom-4` didn't work because AppLayout main has no fixed height scroll container
- Fix: CTA uses `fixed bottom-16 left-0 right-0 z-20 px-4` on mobile, `md:static` on desktop
- This positions the button just above the mobile bottom nav (~64px height)

## Dashboard integration
- Non-resellers see a promotional banner linking to `/become-reseller`
- Active resellers see a green "Reseller Account Active" badge
- Sidebar nav includes "Reseller Hub" link with Crown icon

## Admin Settings
- `resellerCommissionRate` configurable in Admin → Settings → Wallet Settings
- Wallet Settings section saves this alongside referralBonus and minFunding

## Data Plans admin
- PlanForm now includes a Reseller Price field (optional input)
- Reseller price saved via updateMutation/createMutation as `resellerPrice`

**Why:** Users pay ₦500 one-time to unlock wholesale prices + earn commission from referrals. Commission is purely automatic — no manual steps needed. Reseller price is per-plan, optional.
