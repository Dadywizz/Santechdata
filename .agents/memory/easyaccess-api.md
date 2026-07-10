---
name: EasyAccess API
description: EasyAccess (easyaccess.com.ng) VTU API reference — endpoints, numeric codes, and current usage scope in this project.
---

# EasyAccess API

Base URL: `https://easyaccess.com.ng/api/live/v1`
Auth: `Authorization: Bearer {token}` + `Cache-Control: no-cache`
Token stored as DB setting `easyaccess_api_token` (Admin → Settings) or `EASYACCESS_API_TOKEN` env fallback.

## Current usage in this project
EasyAccess is wired as: **electricity** (`elec_provider` setting, live), **exam pins** for WAEC/NECO/NABTEB (per-exam `exam_provider_*` setting — NECO is live; JAMB unsupported, auto-falls back), and is a *selectable option* for **Data** per network (`net_provider_*` setting) but is NOT actually enabled for any network by default — see caveat below. Airtime has no EasyAccess endpoint; if a network's provider resolves to easyaccess, airtime purchases auto-fall back to the primary provider (kyb/bigisub). Scope has changed over time as providers were swapped in/out — always re-check `easyaccess.ts` and `activeProvider.ts` rather than assuming.

**Data plan-code caveat (do not enable EasyAccess for a network's Data routing without doing this first):** `data_plans.providerCode` is a single shared string column holding whichever provider last synced the catalog (currently KYB/BigISub numeric IDs, e.g. MTN 1GB = "859"). EasyAccess uses a completely different ID scheme (fetched via `GET /get-plans`, e.g. MTN 1GB = plan_id "51") with different plan sizes/validities offered, so switching a network's Data provider to EasyAccess without remapping `providerCode` per plan will send invalid plan IDs and fail purchases. EasyAccess's data wholesale pricing also runs well above current KYB cost (e.g. MTN 1GB: KYB cost ~₦228 vs EasyAccess ~₦779), so remapping also has margin implications, not just a technical mapping exercise. A read-only `GET /admin/easyaccess-plans?product_type=X` admin route exists to inspect EasyAccess's live catalog for this comparison.

## Supported endpoints

| Service | Method | Endpoint | Key fields |
|---------|--------|----------|------------|
| Data purchase | POST | `/purchase-data` | `network` (int), `dataplan` (int plan_id), `mobileno` |
| Electricity purchase | POST | `/pay-electricity` | `company` (int), `metertype` (int 1/2), `meterno`, `amount` |
| Verify meter | POST | `/verify-electricity` | same fields as pay-electricity |
| Cable TV | POST | `/pay-tv` | `company` (int), `package` (int plan_id), `iucno` |
| Exam pins | POST | `/exam-pins` | `exam_board` (string), `no_of_pins` (int) |
| Get plans | GET | `/get-plans?product_type=X` | see product_type values below |
| Wallet balance | GET | `/wallet-balance` | — |

Airtime has no EasyAccess endpoint.

## Numeric codes

### Network codes (for `/purchase-data`)
- 1 = MTN, 2 = GLO, 3 = AIRTEL, 4 = 9MOBILE

### Electricity company codes (for `/pay-electricity` and `/verify-electricity`)
- 1=Ikeja, 2=Eko, 3=Abuja, 4=Kaduna, 5=Port Harcourt, 6=Ibadan, 7=Enugu, 8=Jos, 9=Benin, 10=Kano, 11=Yola, 12=Aba
- Companies 13-20 exist but are "currently unavailable"

### Meter type codes
- 1 = prepaid, 2 = postpaid

### Cable company codes (for `/pay-tv`)
- 1 = DStv, 2 = GOtv, 3 = StarTimes

## Plan ID product_type values for GET /get-plans
- Data: `mtn_sme`, `glo_gifting`, `airtel_gifting`, `9mobile_sme`
- Cable: `dstv`, `gotv`, `startimes`
- Exam: `waec`, `neco`, `nabteb` (jamb not supported)

## Success detection
Response is success when: `code === 200` AND `status === "success" | "successful"`

## Provider file
`artifacts/api-server/src/lib/providers/easyaccess.ts`
