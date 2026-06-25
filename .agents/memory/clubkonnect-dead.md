---
name: Clubkonnect Provider
description: Clubkonnect/Nellobyte integration status — DO NOT use
---

## Status: DEAD — requires paid membership, do not pursue

**Nellobyte Systems (nellobytesystems.com)** is the actual backend behind the "Clubkonnect" API.
The VTU purchase endpoints (airtime, data, electricity, cable) require a paid reseller membership:
- Reseller tier: ~₦30,000/year
- Distributor tier: ₦100,000/year

**Test results (June 2026):**
- Balance check (`/APIWalletBalance.asp`) → ✅ returns JSON, credentials valid
- Airtime purchase (`/APIAirtimeVTU.asp`) → ❌ empty response body (service not activated)
- Data purchase → ❌ empty/404 response

**Root cause of all "Clubkonnect non-JSON: " errors** — the account has ₦997 balance but VTU services are locked behind the paid reseller activation.

**Decision:** User chose NOT to pay the membership fee. KYB Data is the sole provider.

**Do NOT suggest Clubkonnect or Nellobyte as a future provider option** unless user explicitly brings it up and confirms they have paid the membership fee.

**Correct API base URL** (for reference if ever needed): `https://www.nellobytesystems.com`  
Auth: `UserID=CK101280559&APIKey=...` as GET query params on every request.
