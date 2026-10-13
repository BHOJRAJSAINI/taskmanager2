# Task Manager — server version (v3.14.0 logic, Google Sheets as database)

Pura `Code.gs` ab Node server par chalta hai; `Index.html` static serve hota hai; database abhi bhi Google Sheets/Drive hai (service account ke through).

```
browser (public/index.html)  --POST /api/rpc {fn,args}-->  lib/rpc-handler -> lib/runner -> lib/code.js (original Code.gs logic)
                                                                              \-> lib/google.js (Sheets + Drive REST)
```

## 1. Google setup (one time)
1. Google Cloud Console → project → enable **Google Sheets API** and **Google Drive API**.
2. IAM → Service Accounts → create → Keys → JSON key download.
3. Us service account email (`...@...iam.gserviceaccount.com`) ko **Editor** access do:
   - Spreadsheets: `17-XljgEdKtk_Mux8Z0z949XWkVFGHW2u7hEXM2ub0bE` (Master Checklist), `1N8kV9QNMELh78ER3Hc-gkOK9bCdYtaFXe_GjsX6MW-g` (Task List + Doer List), `1W-vmPUY09k7a2U-g2EQHVnlMCfWkt0ZTE7mtaJ34FYg` (Delegation), `1RYzLVoWsjj7Brm-wkFIFRSbim0RL6pm-ZcMJD3Y5mQU` (User sheet), `1q6HdW0vz1OWguRhwja1kd_WUt8YAyBcRLaQ-FiulJC0` (Help Ticket)
   - Drive folder `16TiLYcxdjBCUHcFKARa1J9x9HXWiqze1` (checklist photos)
   - (optional) ek Drive folder jahan naye FMS spreadsheets bane → `FMS_PARENT_FOLDER_ID`. Note: service account ke apne Drive me bani files uski storage quota use karti hain; folder share karna better hai.
4. Har spreadsheet ka **timezone** (File → Settings) = `APP_TIMEZONE` (default `Asia/Kolkata`).

## 2. Environment variables
See `.env.example`. Required: `GOOGLE_SERVICE_ACCOUNT_JSON` (poora JSON, single line ya base64-free raw JSON), `SESSION_SECRET` (16+ random chars). Optional: `APP_TIMEZONE`, `FMS_PARENT_FOLDER_ID`, `FMS_SHARE_WITH`, `UPSTASH_REDIS_REST_URL`/`TOKEN`.

## 3. Run
- Local / VPS: `npm install && cp .env.example .env` (fill) `&& npm start` → http://localhost:3000
- Vercel: repo push → import project → env vars set → deploy. `api/rpc.js` function + `public/` static.
- Tests: `npm test` (fake Google adapter, no network).

## 4. How it works / differences from Apps Script
- `lib/code.js` auto-generated from `original/Code.gs` by `npm run port` (business logic untouched; only CacheService, Drive upload, Spreadsheet creation, doGet replaced). `public/index.html` likewise from `original/Index.html` (adds `google.script.run` shim + client-side photo compression for Vercel's 4.5 MB body limit).
- Each call runs on in-memory sheet snapshots; writes are batched to Sheets only if the function finishes. Reads that miss data trigger an automatic reload+replay.
- Sessions: stateless HMAC-signed tokens (24h). Logout just drops the token client-side.
- Writes are serialised with a global lock: in-process always; **across Vercel instances only if Upstash Redis env vars are set**. Without Redis, two simultaneous writes on different instances can collide (ID generation/appendRow). Recommended for production.
- Only functions taking a session `token` (+ `loginUser`, `getNextDelegationTaskId`) are callable via RPC.
- Known carry-overs from the original: plaintext passwords in the Doer List, `loginUser`/`getNextDelegationTaskId` unauthenticated. API writes don't enforce sheet data-validation rules.
- Keep `original/` — to change logic edit `original/Code.gs`, run `npm run port`.
