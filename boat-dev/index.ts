// Clones the demo app into a Boat sandbox, installs, builds and serves it for HOLD_SECONDS.
// Needs BOAT_API_KEY (root .env) and DATABASE_URL (demo-app/.env.local).
import { BoatApi, Configuration, runCommand, waitUntilReady } from "@boatdev/sdk";
import {
  APP_DIR, BUILD, INSTALL, PORT, REPO_URL, START,
  appEnv, cleanupOnInterrupt, createRun, hold, requireEnv, waitForHealth,
} from "../shared.ts";

const run = createRun("boat");
const boat = new BoatApi(
  new Configuration({ basePath: "https://boat.dev/api/v1", accessToken: requireEnv("BOAT_API_KEY") }),
);

const sandboxId = await run.step("create sandbox", async () => {
  const { sandbox } = await boat.create({
    type: "small", // 2 vCPU, 4 GB, same as the other providers
    ttlSeconds: 15 * 60, // backstop if this script dies
    env: appEnv("boat"),
  });
  await waitUntilReady(boat, sandbox.id);
  return sandbox.id;
});
const remove = () => boat.deleteSandbox({ sandboxId, xAsciiConfirmDelete: sandboxId });
cleanupOnInterrupt(remove);

// Paths are relative to /home/user.
const appDir = `app/${APP_DIR}`;

/** Runs a command, streaming its output, and throws on a non-zero exit. */
async function sh(command: string, cwd?: string) {
  let exitCode: number | null | undefined;
  for await (const frame of runCommand(boat, sandboxId, command, { cwd })) {
    if (frame.type === "stdout") process.stdout.write(String(frame.data));
    if (frame.type === "stderr") process.stderr.write(String(frame.data));
    if (frame.type === "error") throw new Error(`"${command}" failed: ${frame.message}`);
    if (frame.type === "exit") exitCode = frame.exitCode;
  }
  if (exitCode !== 0) throw new Error(`"${command}" exited with ${exitCode}`);
}

try {
  await run.step("clone", () => sh(`git clone --depth 1 ${REPO_URL} app`));
  await run.step("install", () => sh(INSTALL, appDir));
  await run.step("build", () => sh(BUILD, appDir));

  await boat.command({ sandboxId, command: START, cwd: appDir, detached: true });
  const { url } = await boat.hostPort({ sandboxId, port: PORT, _public: true });
  if (!url) throw new Error(`Boat did not return a URL for port ${PORT}`);
  console.log(await run.step("start", () => waitForHealth(url)));

  await hold(url);
} finally {
  await run.step("delete sandbox", remove);
  run.summary();
}
