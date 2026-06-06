---
name: EasyAccess API
description: VTU provider replacing VTpass. Covers endpoints, numeric codes, plan IDs, and what is/isn't supported.
---

# EasyAccess API

Base URL: `https://easyaccess.com.ng/api/live/v1`
Auth: `Authorization: Bearer {EASYACCESS_API_TOKEN}` + `Cache-Control: no-cache`
Secret stored as: `EASYACCESS_API_TOKEN`

## Supported endpoints

| Service | Method | Endpoint | Key fields |
|---------|--------|----------|------------|
| Data purchase | POST | `/purchase-data` | `network` (int), `dataplan` (int plan_id), `mobileno` |
| Electricity | POST | `/pay-electricity` | `company` (int), `metertype` (int 1/2), `meterno`, `amount` |
| Verify meter | POST | `/verify-electricity` | same fields as pay-electricity |
| Cable TV | POST | `/pay-tv` | `company` (int), `package` (int plan_id), `iucno` |
| Exam pins | POST | `/exam-pins` | `exam_board` (string), `no_of_pins` (int) |
| Get plans | GET | `/get-plans?product_type=X` | see product_type values below |
| Wallet balance | GET | `/wallet-balance` | — |

## Airtime
**NOT SUPPORTED** by EasyAccess. Airtime still falls back to VTpass (`vtpassPurchaseAirtime`).

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

**Why:** Replaced VTpass (broken API key) and Clubkonnect (all endpoints dead). EasyAccess is live and confirmed working with the stored token.

**How to apply:** All VTU purchases (data, electricity, cable, exam) go through `easyaccess.ts`. Airtime still uses `vtpass.ts` since EasyAccess has no airtime endpoint. Data plan IDs in DB `provider_code` column are EasyAccess integer plan_ids as strings.
