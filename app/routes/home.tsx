import type { Route } from "./+types/home";
import {
  getRecentReadings,
  type SupabaseEnv,
  type WaterReading,
} from "../lib/supabase.server";

export function meta() {
  return [{ title: "Water Flow Dashboard" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env as unknown as SupabaseEnv;
  const readings = await getRecentReadings(env, 100);
  return { readings };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { readings } = loaderData as { readings: WaterReading[] };

  const bySender = new Map<string, WaterReading>();
  for (const r of readings) {
    if (!bySender.has(r.sender_name)) bySender.set(r.sender_name, r); // newest first
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Water Flow Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[...bySender.values()].map((r) => (
          <div key={r.sender_id} className="rounded-xl border p-4 shadow-sm">
            <div className="text-sm text-gray-500">{r.sender_name}</div>
            <div className="text-3xl font-semibold">
              {r.flow_rate.toFixed(2)}{" "}
              <span className="text-base font-normal">L/min</span>
            </div>
            <div className="text-sm text-gray-500">
              Total {r.volume.toFixed(1)} L · {new Date(r.ts).toLocaleString()}
            </div>
          </div>
        ))}
        {readings.length === 0 && (
          <p className="text-gray-500">No readings yet — waiting for the receiver.</p>
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Time</th>
            <th>Tap</th>
            <th className="text-right">Flow (L/min)</th>
            <th className="text-right">Volume (L)</th>
            <th className="text-right">RSSI</th>
            <th className="text-right">SNR</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((r) => (
            <tr key={r.id} className="border-b border-gray-100">
              <td className="py-1.5">{new Date(r.ts).toLocaleString()}</td>
              <td>{r.sender_name}</td>
              <td className="text-right">{r.flow_rate.toFixed(2)}</td>
              <td className="text-right">{r.volume.toFixed(2)}</td>
              <td className="text-right">{r.rssi ?? "—"}</td>
              <td className="text-right">{r.snr ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
