// Minimal Supabase REST helper — no npm dependency needed.
// Uses the service_role key, so this must ONLY run server-side (Worker).

export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEVICE_API_KEY: string;
}

function headers(env: SupabaseEnv): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function insertReading(env: SupabaseEnv, row: Record<string, unknown>) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/water_readings`, {
    method: "POST",
    headers: { ...headers(env), Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert failed (${res.status}): ${await res.text()}`);
}

export async function getRecentReadings(env: SupabaseEnv, limit = 50) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/water_readings?select=*&order=ts.desc&limit=${limit}`,
    { headers: headers(env) },
  );
  if (!res.ok) throw new Error(`Supabase query failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as WaterReading[];
}

export interface WaterReading {
  id: number;
  feedlot_id: string;
  gateway_id: string;
  sender_id: number;
  sender_name: string;
  ts: string;
  flow_rate: number;
  volume: number;
  rssi: number | null;
  snr: number | null;
  created_at: string;
}
