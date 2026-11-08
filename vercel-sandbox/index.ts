// Clones the demo app into a Vercel Sandbox, installs, builds and serves it for HOLD_SECONDS.
// Auth: VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID (root .env), or a VERCEL_OIDC_TOKEN
// from `vercel link && vercel env pull`. Also needs DATABASE_URL (demo-app/.env.local).
import { posix } from "node:path";
import { Sandbox } from "@vercel/sandbox";
import {
  APP_DIR, BUILD, INSTALL, PORT, REPO_URL, START,
  appEnv, cleanupOnInterrupt, createRun, hold, requireEnv, waitForHealth,
} from "../shared.ts";

const run = createRun("vercel");

const credentials = process.env.VERCEL_TOKEN
  ? {
      token: requireEnv("VERCEL_TOKEN"),
      teamId: requireEnv("VERCEL_TEAM_ID"),
      projectId: requireEnv("VERCEL_PROJECT_ID"),
    }
  : {};

// Vercel clones the repo as part of creating the sandbox.
const sandbox = await run.step("create sandbox + clone", () =>
  Sandbox.create({
    ...credentials,
    source: { type: "git", url: REPO_URL, depth: 1 },
    image: "vercel/sandbox/node:24",
    resources: { vcpus: 2 }, // 2 vCPU, 4 GB, same as the other providers
    ports: [PORT],
    timeout: 15 * 60_000, // backstop if this script dies
    env: appEnv("vercel"),
  }),
);
cleanupOnInterrupt(() => sandbox.stop());

// With `image`, Vercel clones into <cwd>/<repo name>, not into cwd itself.
const appDir = `${sandbox.cwd}/${posix.basename(new URL(REPO_URL).pathname, ".git")}/${APP_DIR}`;

/** Runs a command in the app folder, streaming its output, and throws on a non-zero exit. */
async function sh(command: string) {
  const { exitCode } = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", command],
    cwd: appDir,
    stdout: process.stdout,
    stderr: process.stderr,
  });
  if (exitCode !== 0) throw new Error(`"${command}" exited with ${exitCode}`);
}

try {
  await run.step("install", () => sh(INSTALL));
  await run.step("build", () => sh(BUILD));

  await sandbox.runCommand({ cmd: "bash", args: ["-c", START], cwd: appDir, detached: true });
  const url = sandbox.domain(PORT);
  console.log(await run.step("start", () => waitForHealth(url)));

  await hold(url);
} finally {
  await run.step("stop sandbox", () => sandbox.stop());
  run.summary();
}
