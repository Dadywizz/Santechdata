---
name: EasyAccess API
description: EasyAccess (easyaccess.com.ng) VTU API reference — endpoints, numeric codes, and current usage scope in this project.
---

# EasyAccess API

Base URL: `https://easyaccess.com.ng/api/live/v1`
Auth: `Authorization: Bearer {token}` + `Cache-Control: no-cache`
Token stored as DB setting `easyaccess_api_token` (Admin → Settings) or `EASYACCESS_API_TOKEN` env fallback.

## Current usage in this project
EasyAccess is wired as the **electricity** provider only (toggle via Admin → Settings → Provider Routing → Electricity, DB setting `elec_provider`). BigISub/KYB Data remain primary for data, airtime, cable, and exam pins — do not assume EasyAccess covers those without re-checking `easyaccess.ts`, since scope has changed over time as providers were swapped in/out.

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
