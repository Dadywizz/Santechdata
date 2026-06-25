---
name: Clubkonnect Provider
description: Clubkonnect integration status and credential format
---

## Status: Integrated (credentials may need user to verify account)

Clubkonnect is now provider slot 2 in the active provider system (replaced Husmodata stub).

**Credentials required:**
- `clubkonnect_api_key` — API key from Clubkonnect dashboard  
- `clubkonnect_user_id` — registered phone number (UserID)

**API format:**
- Base: `https://www.clubkonnect.com/api/v2/`
- Auth: `UserID` + `APIKey` in POST body on every request
- Exam endpoints: separate paths per type `/waec/`, `/neco/`, `/jamb/`, `/nabteb/`

**Previous failure reason:** INVALID_CREDENTIALS / 404 errors in earlier tests — likely because the account was not yet verified for API/reseller access on Clubkonnect. Once the user is approved for API access, the integration should work.

**How to link:** Admin → Settings → Clubkonnect card — enter API Key + Phone, press "Link Provider"
