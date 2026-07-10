# Water Flow: Device → Worker → Supabase Setup

Architecture: **ESP32 receiver → POST /api/readings (Cloudflare Worker) → Supabase → dashboard served by the same Worker.**

You do NOT need Cloudflare Pages — your React Router v7 app on Workers serves both the frontend and the API from one deploy.

## 1. Supabase — create the table

Open the SQL editor for your project and run `supabase-schema.sql`:
https://supabase.com/dashboard/project/nzlnollwpzzgvpyrpcpa/sql/new

Then grab your **service_role** key from Settings → API keys (keep it secret — it only ever lives in the Worker, never in the browser or device).

## 2. Copy these files into your water-flow repo

From this `cloudflare-worker/` folder into https://github.com/arnoldjosephaguila/water-flow:

| File | Destination | Notes |
|---|---|---|
| `app/lib/supabase.server.ts` | `app/lib/` | new |
| `app/routes/api.readings.ts` | `app/routes/` | new — device ingest endpoint |
| `app/routes.ts` | `app/` | replaces existing |
| `app/routes/home.tsx` | `app/routes/` | replaces existing — dashboard |
| `.dev.vars.example` | repo root | copy to `.dev.vars`, fill in real values |

Also fix a pre-existing gap (tsconfig references it but it isn't installed):

```
npm i -D @cloudflare/workers-types
```

## 3. Set the Worker secrets

Pick a long random API key for the device (e.g. run `openssl rand -hex 24`), then:

```
npx wrangler secret put SUPABASE_URL
# paste: https://nzlnollwpzzgvpyrpcpa.supabase.co
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste your service_role key
npx wrangler secret put DEVICE_API_KEY
# paste your random device key
```

For local dev, put the same three values in `.dev.vars` (already gitignored by the starter — verify).

## 4. Deploy

```
npm run deploy
```

Note the URL it prints, e.g. `https://water-flow.<your-subdomain>.workers.dev`.

Test the endpoint:

```
curl -X POST https://water-flow.<your-subdomain>.workers.dev/api/readings \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_DEVICE_KEY" \
  -d '{"feedlot_id":"feedlot1","gateway_id":"receiver-01","sender_id":1,"sender_name":"Tap 1","timestamp":"2026-07-10 12:00:00","flow_rate":3.2,"volume":120.5,"rssi":-88,"snr":9}'
```

Expect `{"ok":true}`, and the row visible in Supabase Table Editor. Open the Worker URL in a browser to see the dashboard.

## 5. Update the ESP32 firmware

`WaterReceiver/WaterReceiver.ino` has already been edited:

- `CENTRAL_SERVER_URL` now points at `.../api/readings` — **replace `YOUR-SUBDOMAIN` with your real workers.dev subdomain**
- New `DEVICE_API_KEY` define — **set it to the same key from step 3**
- `sendToCentralServer()` now uses `WiFiClientSecure` (required for HTTPS on ESP32) and sends the `x-api-key` header

Recompile, flash (or bump `FW_VERSION` and push the new .bin for OTA), and watch the serial monitor for `Central server: HTTP 201`.

## Troubleshooting

- **HTTP 401** from device → API key mismatch between firmware and Worker secret.
- **HTTP 502** → check Supabase: `npx wrangler tail` shows the Worker's error logs live.
- **HTTP -1 / connection failed on ESP32** → HTTPS issue; confirm `client.setInsecure()` line is present and WiFi is up.
- Timestamps: the device sends local time (UTC-7 + DST). Postgres stores it as `timestamptz` assuming UTC, so times will be offset. Cleanest fix later: set the device's NTP offset to 0 (send UTC) and format in the dashboard.
