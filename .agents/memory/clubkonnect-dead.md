---
name: Clubkonnect — Dead Provider
description: All Clubkonnect VTU endpoints are broken; do not use
---

## Status: Do not use

All tested endpoints return 404 or INVALID_CREDENTIALS:
- Airtime: 404
- Cable: 404
- Electricity verify: 404
- NECO/NABTEB: 404
- Data: rejects password
- Electricity purchase: INVALID_CREDENTIALS
- WAEC: INVALID_CREDENTIALS
- JAMB: INVALID_CREDENTIALS

**Why:** Extensively tested in earlier sessions. The credentials are set (CLUBKONNECT_APIKEY, PASSWORD, PHONE) but the API doesn't accept them. Not worth debugging.
