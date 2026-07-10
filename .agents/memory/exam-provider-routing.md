---
name: Exam token provider routing
description: Why JAMB/NABTEB exam purchases can silently fail even when priced and "supported" — read before touching exam purchase or pricing code.
---

`activePurchaseExam` (lib/providers/activeProvider.ts) already fully supports WAEC/NECO/JAMB/NABTEB and routes each independently per the `exam_provider_<CODE>` DB setting. BigISub in particular maps all four via `examCode` internally and does not need a numeric exam ID at all.

The `/exam/purchase` route in `services.ts` used to hardcode `KYB_EXAM_IDS = { NECO: 19, WAEC: 34 }` and hard-403/503'd any exam code missing from that map — silently blocking JAMB/NABTEB purchases even after an admin priced them and even though the provider layer could serve them via BigISub. Fixed by only using that numeric ID as a fallback for the KYB-routed case, and letting `activePurchaseExam` do the real routing; a KYB-routed exam with an unknown ID now fails at the provider call (with the existing refund-on-failure path) instead of being blocked upfront.

**Why:** Admin pricing UI and provider routing capability are two separate layers — adding pricing for a new exam code does not guarantee purchases work if a route has its own hardcoded allowlist.

**How to apply:** When adding/enabling a new exam code (or network/disco), check both (1) admin pricing/config UI and (2) the actual purchase route in `services.ts` for hardcoded allowlists — don't assume `activeProvider.ts` support is sufficient. Also check the current `exam_provider_<CODE>` / `net_provider_<X>` settings in the DB (dev and prod are separate) since routing may point at a provider that doesn't actually support that code.
