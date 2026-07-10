---
name: Provider routing keys (providerCode vs numeric discoid)
description: Electricity/cable provider functions expect different identifier shapes — mixing them silently breaks a non-default provider.
---

# Provider routing keys: providerCode vs numeric discoid

`services.ts` stores one canonical identifier per electricity disco: `providerCode` (a string slug like `"abuja-electric"`). KYB Data's API wants its own numeric `discoid`, so `services.ts` also maintains a `KYB_ELEC_DISCO_ID` lookup from `providerCode` → KYB's numeric id.

Other providers (BigISub, EasyAccess) key their internal maps by the canonical `providerCode` string, not by KYB's numeric discoid. If a provider-routing function only forwards `discoid` downstream, a non-KYB provider silently receives the wrong identifier (KYB's number where it expected `providerCode`) and every lookup misses.

**Why:** This exact bug existed latent in `bigisubPurchaseElectricity`/`bigisubVerifyMeter` — their `BIGISUB_DISCO_MAP` was keyed by `providerCode` strings, but the router was passing KYB's `discoid` through. It wasn't caught earlier because BigISub wasn't the active electricity provider at the time.

**How to apply:** When adding or routing to a new electricity/cable provider in `activeProvider.ts`, always thread the original `providerCode` string through as its own field (separate from `discoid`) in the router's opts, and have each non-KYB provider function key its lookups off `providerCode`, not `discoid`. Only call the provider whose lookup map actually matches the identifier you're passing.
