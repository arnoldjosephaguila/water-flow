// Resource route: the ESP32 receiver POSTs JSON here.
// POST /api/readings  (header: x-api-key)
// GET  /api/readings  → latest 50 readings as JSON
import type { Route } from "./+types/api.readings";
import {
  insertReading,
  getRecentReadings,
  type SupabaseEnv,
} from "../lib/supabase.server";

interface DevicePayload {
  feedlot_id: string;
  gateway_id: string;
  sender_id: number;
  sender_name: string;
  timestamp: string; // "YYYY-MM-DD HH:MM:SS" local device time
  flow_rate: number;
  volume: number;
  rssi?: number;
  snr?: number;
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env as unknown as SupabaseEnv;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (request.headers.get("x-api-key") !== env.DEVICE_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DevicePayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body.feedlot_id ||
    !body.gateway_id ||
    typeof body.sender_id !== "number" ||
    typeof body.flow_rate !== "number" ||
    typeof body.volume !== "number"
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await insertReading(env, {
      feedlot_id: body.feedlot_id,
      gateway_id: body.gateway_id,
      sender_id: body.sender_id,
      sender_name: body.sender_name ?? "Unknown",
      // Device sends local time with no zone; store as-is (adjust if you switch device to UTC)
      ts: body.timestamp ?? new Date().toISOString(),
      flow_rate: body.flow_rate,
      volume: body.volume,
      rssi: body.rssi ?? null,
      snr: body.snr ?? null,
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Database insert failed" }, { status: 502 });
  }
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env as unknown as SupabaseEnv;
  const readings = await getRecentReadings(env);
  return Response.json(readings);
}
