---
name: Payment Gateways
description: Status of each payment gateway — what works and what doesn't
---

## Paystack ✅
- PAYSTACK_SECRET_KEY is set and valid
- /transaction/initialize returns checkout URL
- Fully working for wallet funding

## Monnify ✅
- MONNIFY_API_KEY starts with MK_TEST_ → uses sandbox.monnify.com
- Auth works, checkout URL generated
- Will use live URL automatically when live key is set

## Flutterwave ❌
- FLUTTERWAVE_SECRET_KEY is 32 chars, doesn't start with FLWSECK — completely wrong key
- Returns "Invalid authorization key" from Flutterwave API
- Removed from customer UI (fund-wallet.tsx) and admin settings
- User provided Merchant ID 100801215 — this is NOT the secret key
- To re-enable: user needs FLWSECK_LIVE... or FLWSECK_TEST... key from Flutterwave Dashboard → Settings → API Keys

**Why:** Removed rather than showing broken option to customers.
