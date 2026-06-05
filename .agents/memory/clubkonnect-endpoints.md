---
name: Clubkonnect API Endpoints
description: Which Clubkonnect endpoints actually exist, auth methods, and known issues
---

## Confirmed Working (return JSON, not 404)
- `APIWalletBalanceV1.asp` — exists, APIKey auth
- `APIEPINDatabundleV1.asp` — exists, Password auth (NOT APIKey); IP 34.23.115.86 needs whitelist
- `APIElectricityV1.asp` — exists, APIKey auth; returns INVALID_CREDENTIALS (IP not whitelisted)
- `APIWaecV1.asp` — exists, APIKey auth; returns INVALID_CREDENTIALS (IP not whitelisted)
- `APIJambV1.asp` — exists, APIKey auth; returns INVALID_CREDENTIALS (IP not whitelisted)

## 404 (Do Not Exist — tested 30+ variations)
- Airtime: no valid URL found (tried APIAirtimeV1, APISendAirtimeV1, APITopupV1, APIAirtimeRechargeV1, APIBuyAirTimeV1, APIVTUAirtimeV1, APIAirtimeEPINV1, 20+ more)
- Electricity meter verify: APIVerifyMeterV1.asp is 404
- Cable subscribe: APICableV1.asp is 404
- Cable verify smartcard: APIVerifySmartCardV1.asp is 404
- NECO: APINecoV1.asp is 404
- NABTEB: APINabtebV1.asp is 404
- Data plans list: APIGetDatabundlePlanV1.asp is 404

## Error Code Meanings
- `INVALID_CREDENTIALS3` = IP not whitelisted (key is accepted, but IP blocked)
- `INVALID_CREDENTIALS2` = wrong Password
- `INVALID_CREDENTIALS` = wrong APIKey (OR IP blocked showing different code for some endpoints)
- `MISSING_CREDENTIALS` = required field missing

## Auth Rules
- Data endpoint: Password auth (UserID=phone, Password=login password "Sani,2020" — but this is REJECTED, so API password may differ from login password)
- All other endpoints: APIKey auth (UserID=phone, APIKey=generated key)

## Server IP
- Must whitelist `34.23.115.86` on Clubkonnect API Settings page

## Account Credentials
- Phone (UserID): 08063136201
- API Key: stored as CLUBKONNECT_APIKEY secret
- Password: stored as CLUBKONNECT_PASSWORD secret

**Why:** Exhaustive live testing over multiple sessions — saved so future agent doesn't repeat the same 30+ endpoint guessing attempts.

**How to apply:** Do NOT guess airtime/cable/verify-meter endpoint URLs. Contact Clubkonnect support for correct URLs. For endpoints that exist, ensure IP is whitelisted first before troubleshooting auth.
