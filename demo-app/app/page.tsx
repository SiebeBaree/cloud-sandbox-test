import { hostname } from "node:os";
import { connection } from "next/server";
import { Suspense } from "react";
import { water } from "./actions";
import { listPlants, provider, type Plant } from "@/lib/plants";

const DAY = 24 * 60 * 60 * 1000;

function daysUntilDue(plant: Plant, now: number) {
  const due = plant.lastWateredAt.getTime() + plant.waterEveryDays * DAY;
  return Math.round((due - now) / DAY);
}

function dueLabel(days: number) {
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "today";
  return `in ${days}d`;
}

function agoLabel(date: Date, now: number) {
  const days = Math.floor((now - date.getTime()) / DAY);
  if (days === 0) return "today";
  return `${days}d ago`;
}

async function Plants() {
  await connection();
  const started = performance.now();
  const plants = await listPlants();
  const dbMs = Math.round(performance.now() - started);
  const now = Date.now();

  return (
    <>
      <p className="meta">
        {provider} on {hostname()}, {plants.length} plants, query {dbMs}ms
      </p>
      <table>
        <thead>
          <tr>
            <th>Plant</th>
            <th>Room</th>
            <th>Due</th>
            <th>Last watered</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {plants.map((plant) => {
            const days = daysUntilDue(plant, now);
            return (
              <tr key={plant.id} data-thirsty={days < 0}>
                <td>
                  {plant.name}
                  <span className="species">{plant.species}</span>
                </td>
                <td>{plant.room}</td>
                <td className="due">{dueLabel(days)}</td>
                <td>
                  {agoLabel(plant.lastWateredAt, now)} by {plant.lastWateredBy}
                </td>
                <td>
                  <form action={water.bind(null, plant.id)}>
                    <button type="submit">Water</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default function Page() {
  return (
    <main>
      <h1>Thirsty</h1>
      <Suspense fallback={<p className="meta">Loading plants</p>}>
        <Plants />
      </Suspense>
    </main>
  );
}
