// Resets the `plants` table and fills it with fake data. Run locally once: `npm run db:seed`.
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const sql = neon(databaseUrl);

const plants = [
  { name: "Monstera", species: "Monstera deliciosa", room: "Living room", every: 7, ago: 9 },
  { name: "Fiddle leaf fig", species: "Ficus lyrata", room: "Living room", every: 7, ago: 3 },
  { name: "Snake plant", species: "Dracaena trifasciata", room: "Bedroom", every: 14, ago: 16 },
  { name: "Pothos", species: "Epipremnum aureum", room: "Kitchen", every: 5, ago: 5 },
  { name: "Peace lily", species: "Spathiphyllum wallisii", room: "Bathroom", every: 4, ago: 1 },
  { name: "ZZ plant", species: "Zamioculcas zamiifolia", room: "Office", every: 21, ago: 10 },
  { name: "Calathea", species: "Goeppertia orbifolia", room: "Bedroom", every: 4, ago: 6 },
  { name: "Basil", species: "Ocimum basilicum", room: "Kitchen", every: 2, ago: 2 },
  { name: "String of pearls", species: "Curio rowleyanus", room: "Office", every: 12, ago: 4 },
  { name: "Bird of paradise", species: "Strelitzia nicolai", room: "Hallway", every: 7, ago: 8 },
  { name: "Aloe", species: "Aloe vera", room: "Kitchen", every: 18, ago: 0 },
  { name: "Boston fern", species: "Nephrolepis exaltata", room: "Bathroom", every: 3, ago: 4 },
];

await sql`drop table if exists plants`;
await sql`
  create table plants (
    id serial primary key,
    name text not null,
    species text not null,
    room text not null,
    water_every_days int not null check (water_every_days > 0),
    last_watered_at timestamptz not null,
    last_watered_by text not null
  )
`;
await sql.transaction(
  plants.map(
    (p) => sql`
      insert into plants (name, species, room, water_every_days, last_watered_at, last_watered_by)
      values (${p.name}, ${p.species}, ${p.room}, ${p.every}, now() - make_interval(days => ${p.ago}), 'seed')
    `,
  ),
);

console.log(`Seeded ${plants.length} plants`);
