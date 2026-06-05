---
name: VTpass Provider
description: Auth approach, what works vs what fails, and why purchases return Invalid Credentials
---

## Auth
- Headers: `public-key` + `secret-key` — works for GET (service-variations, etc.)
- Body: `api_key` — required for POST /pay and /merchant-verify
- VTPASS_API_KEY env var is currently the string "null" — NOT a real key

## What works
- GET /service-variations (any serviceID) — returns real plans
- POST /merchant-verify — responds but may not return Customer_Name without real api_key

## What fails
- POST /pay — returns "Invalid Credentials." because api_key is missing/wrong
- GET /balance — also returns "Invalid Credentials."

## Fix
User needs to: VTpass dashboard → Settings → API → copy the "API Key" field → update VTPASS_API_KEY secret in Replit.
This is NOT a new registration — they already have the account.

## Confirmed service IDs on this account
- Airtime: mtn, airtel, glo, etisalat
- Data: mtn-data, airtel-data, glo-data, etisalat-data
- Electricity: ikeja-electric, eko-electric, abuja-electric, kano-electric, portharcourt-electric, jos-electric, kaduna-electric, enugu-electric, ibadan-electric, benin-electric, aba-electric, yola-electric
- Cable: startimes ONLY (dstv/gotv not available on account)
- Exam: waec ONLY (variation_code: waecdirect, ₦3,900)

**Why:** customFetch uses DoH for DNS resolution; form-encoded body (URLSearchParams) used for all POST requests.
