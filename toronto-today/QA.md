# Hosted React verification

## Passed
- React production build completed using installed dependencies, not a CDN stub.
- Frontend: 8 Vitest tests passed. Server: 4 Node tests passed. Publisher: 3 Python tests passed.
- External HTTPS GET /, /healthz and /data/latest.json succeeded. Public JSON matches the allowlisted local publication exactly.
- Public browser checks passed at widths 320, 390, 768 and 1440 with zero horizontal overflow and zero JavaScript exceptions.
- Search, Free filter, section navigation, theme persistence, storage-denied theme operation, failed-refresh retained content and stale-edition warning passed browser interaction tests.
- Live Open-Meteo data appeared with Toronto timestamp and separate attribution.
- Public /.env and /src/App.jsx returned 404; only built static assets and one allowlisted city JSON are served. No public write route.
- toronto-today and toronto-today-tunnel system services active, enabled at boot, zero restarts during verification.
- Existing outbound health remained HTTP 200 with pending 0.

## Current limitations
- Today's data is a conversion of the existing morning research, not a fresh source audit. This provenance is visible on the site.
- Screenshots exist; auxiliary vision review failed due to provider configuration/credentials, so no screenshot-based visual review is claimed. DOM geometry, browser interactions and responsive rendering were tested.
- The daily cron publish/verification/link-delivery prompt is saved. Its first smoke run failed because the old grok-4.5/xai-oauth pin returned personal-team-blocked:spending-limit.
- Following user continuation, only this Toronto job was moved from openai/gpt-6-astra to deepseek/deepseek-v4.1-flash on OpenRouter. Root cause of the 402 was per-token price, not a missing balance: gpt-6-astra is about $10/M in and $50/M out versus $0.30/M and $1.20/M, so its reservation exceeded the available balance. A direct minimal completion succeeded, then a read-only cron smoke passed with verify_deployment.py ok:true. Other jobs were not changed. The hosted page serves existing data without inference.
- Schedule remains 11:00 UTC, currently 7:00 AM Toronto; review DST before winter if local 7:00 AM is required year-round.
