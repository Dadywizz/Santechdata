---
name: BigISub provider
description: BigISub VTU provider integration — API base, auth, and configuration pattern
---

## Provider
- Base URL: `https://bigisub.ng/wp-json/api/v2/`
- Auth: Bearer token in Authorization header
- Token source: DB setting `bigisub_api_token` (set via Admin → Settings) or `BIGISUB_API_TOKEN` env var
- Provider file: `artifacts/api-server/src/lib/providers/bigisub.ts`
- Registered in `activeProvider.ts` alongside KYB Data

## Admin Settings integration
- GET /api/admin/settings returns `bigisub_configured: "true"/"false"`
- PATCH /api/admin/settings with `bigisub_api_token` key stores the token
- `setBigisubToken(token)` function wired in admin.ts PATCH handler

## Frontend
- Settings page PROVIDERS array lists BigISub first (primary), then KYB Data
- `configured` state tracks `{ kyb: boolean, bigisub: boolean }`
- Admin → Settings shows a provider card for each to enter/update the token

**Why:** User switched from KYB Data to BigISub as their primary provider. Both remain available but BigISub is now first in Settings UI.
