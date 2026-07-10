---
name: EasyAccess merchant wallet funding
description: Electricity purchases fail with "insufficient wallet balance" from EasyAccess's own API, not our app's wallet — must be fixed by topping up the EasyAccess merchant account.
---

`easyaccessPurchaseElectricity` passes through EasyAccess's raw API `message` field verbatim (`artifacts/api-server/src/lib/providers/easyaccess.ts`). Two of the messages seen in production for confirmed disco codes (e.g. abuja-electric) were EasyAccess-side, not ours:

- `"Insufficient wallet balance, kindly fund your wallet and try again"` — EasyAccess's own merchant/prepaid account (the one SanTech funds to buy tokens wholesale) is low, not the customer's in-app wallet. Confirmed via `metadata.providerError` on failed `transactions` rows plus the code path only reaching this message when `elec_provider = easyaccess` and the disco is in `EASYACCESS_ELEC_COMPANY_ID`.
- `"Could not complete your order please try again"` — also raw EasyAccess text, not one of our own strings (verified: no match for it anywhere in our codebase).

**Why this matters:** our own low-balance check has different wording ("Insufficient wallet balance. Please fund your wallet to continue.") — if you see the *other* phrasing in logs/transaction metadata, it's the provider's account, and the fix is topping up EasyAccess (Admin → Settings → EasyAccess → re-test connection shows the live balance via `testProviderConnection`/`/admin/link-provider`), not a code change.

**How to apply:** when debugging any "insufficient balance" electricity/data/airtime failure, always check the exact wording against our own hardcoded strings first — if it doesn't match, it's the upstream provider's account balance, not the customer's.

Also fixed in passing: the log line at `services.ts` for electricity purchase responses was hardcoded as `"KYB Data electricity response"` regardless of which provider (`kyb`/`bigisub`/`easyaccess`) actually handled the request — this caused a false lead while investigating (looked like KYB was being hit when it was actually EasyAccess). Renamed to a provider-agnostic label with `providerCode` included.
