import { neon } from "@neondatabase/serverless";
import { z } from "zod";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const sql = neon(databaseUrl);

/** Where this server runs. Each sandbox runner sets SANDBOX_PROVIDER; locally it is "local". */
export const provider = process.env.SANDBOX_PROVIDER ?? "local";

const Plant = z.object({
  id: z.number(),
  name: z.string(),
  species: z.string(),
  room: z.string(),
  waterEveryDays: z.number(),
  lastWateredAt: z.coerce.date(),
  lastWateredBy: z.string(),
});

export type Plant = z.infer<typeof Plant>;

/** All plants, the most overdue first. */
export async function listPlants() {
  const rows = await sql`
    select id, name, species, room,
      water_every_days as "waterEveryDays",
      last_watered_at as "lastWateredAt",
      last_watered_by as "lastWateredBy"
    from plants
    order by last_watered_at + make_interval(days => water_every_days)
  `;
  return z.array(Plant).parse(rows);
}

export async function countPlants() {
  const [row] = await sql`select count(*)::int as count from plants`;
  return z.object({ count: z.number() }).parse(row).count;
}

/** Marks a plant as watered now, credited to the current provider. */
export async function waterPlant(id: number) {
  await sql`
    update plants
    set last_watered_at = now(), last_watered_by = ${provider}
    where id = ${id}
  `;
}
