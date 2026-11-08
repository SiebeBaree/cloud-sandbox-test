"use server";

import { refresh } from "next/cache";
import { waterPlant } from "@/lib/plants";

export async function water(id: number) {
  await waterPlant(id);
  refresh();
}
