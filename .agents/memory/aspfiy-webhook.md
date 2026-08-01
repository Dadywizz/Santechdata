---
name: Aspfiy webhook setup
description: How Aspfiy delivers payment notifications — per-request webhookUrl, not a global dashboard setting; includes the official event-name typo.
---

## Correct API base URL
`https://api-v1.aspfiy.com` — note the `-v1`. The bare `https://api.aspfiy.com` returns HTML (404 page), not JSON. Endpoints need trailing slash: `/reserve-paga/`, `/reserve-palmpay/`.

## Phone number format
Aspfiy requires **11-digit local Nigerian format** (`08012345678`), NOT international (`2348012345678`). Sending international format returns `{"status":false,"message":"Phone should be 11 digit long"}`.

## Response shape
Success response nests the account under `data.account`, not `data.data`:
```
{ status: true, data: { account: { account_number, bank_name }, reference, ... } }
```

## Rule
Pass `webhookUrl` as a **required body field** in every `POST /reserve-paga` and `POST /reserve-palmpay` call. There is no webhook configuration screen in the Aspfiy merchant dashboard.

**Why:** Aspfiy attaches the callback URL to each virtual account individually at creation time. Users looking for a webhook settings page won't find one — that's expected.

## How to apply
- In `aspfiyCreateReservedAccount()`, always include `webhookUrl` in the request body.
- The URL is constructed as `${APP_URL ?? "https://santechdata.com.ng"}/api/wallet/webhook/aspfiy`.
- In dev the webhook won't fire (no public URL), which is acceptable.

## Typo in event name
Aspfiy's docs and actual payloads use `"PAYMENT_NOTIFIFICATION"` (double F), not `"PAYMENT_NOTIFICATION"`.
The webhook handler must accept **both** spellings to be safe.

## Webhook payload key for matching user
`data.merchant_reference` = the `reference` we passed at account creation time (`aspfiy-<userId>`).
`data.reference` is Aspfiy's own internal transaction ID — do not use it for user lookup.
