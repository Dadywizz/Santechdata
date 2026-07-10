---
name: EasyAccess egress-IP blocking on autoscale
description: EasyAccess electricity verification can fail from production while working from dev/other tools, due to IP-level blocking against Replit's rotating autoscale egress IPs.
---

## Symptom

Electricity meter verification through EasyAccess fails in production with EasyAccess's own raw rejection text (e.g. "Invalid meter number supplied, check again") for a meter that is demonstrably valid — verified independently via the dev sandbox (same token/company code/meter, 8/8 success) and via unrelated third-party apps (e.g. OPay, other AEDC-facing apps).

## Root cause

Replit `autoscale` deployments do not have a static outbound/egress IP — egress comes from a rotating pool. EasyAccess appears to reject/flag requests from specific egress IPs (likely a blocklist or abuse heuristic on their end), independent of token validity or payload correctness. When production happens to be running on a "flagged" IP, verification fails consistently; other callers (dev sandbox, other services) using a different IP succeed with identical data.

## How this was confirmed

1. Added a temporary admin-only diagnostic route hitting `api.ipify.org` to read the live egress IP (`GET /admin/debug-egress-ip` in `artifacts/api-server/src/routes/admin.ts`, gated behind `authenticate` + `requireAdmin`).
2. Ran a clean, timestamp-matched A/B test: identical EasyAccess calls succeeded 8/8 from the dev sandbox and failed 6/6 from live production within the same few minutes.
3. Republishing the production autoscale deployment rotated its egress IP; verification then succeeded 3/3 immediately after republish with no code change.

**Why:** This proves the failure mode is tied to production's outbound IP specifically, not to our code, the token, the meter, or EasyAccess being globally down — so future recurrences should be diagnosed the same way (compare dev vs. prod behavior for the *same* request) rather than assumed to be a code regression.

## How to apply

- If EasyAccess verification/purchase starts failing in production while dev/sandbox tests with the same credentials succeed, suspect IP blocking first. Use the `/admin/debug-egress-ip` diagnostic route (re-add if removed) to check the current production egress IP.
- A quick (but not durable) mitigation is republishing production — this rotates the autoscale egress IP and may unblock service if the previous IP was the one flagged.
- Durable fix requires either: (a) a static-outbound-IP proxy (e.g. a fixed-IP relay/VM) that all EasyAccess calls route through, with that fixed IP given to EasyAccess for whitelisting, or (b) asking EasyAccess support what triggers their IP-level rejection so it can be avoided going forward. Replit's autoscale deployments have no built-in static-IP feature.
