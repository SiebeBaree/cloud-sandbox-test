import { hostname } from "node:os";
import { countPlants, provider } from "@/lib/plants";

/** Polled by the sandbox runners to prove the app is up and can reach Neon. */
export async function GET() {
  const started = performance.now();
  const plants = await countPlants();
  return Response.json({
    ok: true,
    provider,
    host: hostname(),
    node: process.version,
    plants,
    dbMs: Math.round(performance.now() - started),
  });
}
