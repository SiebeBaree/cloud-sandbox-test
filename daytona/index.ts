// Clones the demo app into a Daytona sandbox, installs, builds and serves it for HOLD_SECONDS.
// Needs DAYTONA_API_KEY (root .env) and DATABASE_URL (demo-app/.env.local).
import { Daytona } from "@daytona/sdk";
import {
  APP_DIR, BUILD, INSTALL, PORT, REPO_URL, START,
  appEnv, cleanupOnInterrupt, createRun, hold, waitForHealth,
} from "../shared.ts";

const run = createRun("daytona");
const daytona = new Daytona();

const sandbox = await run.step("create sandbox", () =>
  daytona.create({
    snapshot: "daytona-medium", // 2 vCPU, 4 GB, same as the other providers
    envVars: appEnv("daytona"),
    public: true, // preview URLs open without a token
    ephemeral: true, // deleted as soon as it stops
    autoStopInterval: 15, // minutes; backstop if this script dies
  }),
);
cleanupOnInterrupt(() => sandbox.delete());

/** Runs a command in `cwd`, streaming its output, and throws on a non-zero exit. */
async function sh(cwd: string, command: string) {
  const { cmdId } = await sandbox.process.executeSessionCommand("shell", {
    command: `cd ${cwd} && ${command}`,
    runAsync: true,
  });
  await sandbox.process.getSessionCommandLogs(
    "shell",
    cmdId,
    (chunk) => process.stdout.write(chunk),
    (chunk) => process.stderr.write(chunk),
  );
  const { exitCode } = await sandbox.process.getSessionCommand("shell", cmdId);
  if (exitCode !== 0) throw new Error(`"${command}" exited with ${exitCode}`);
}

try {
  const repoDir = `${await sandbox.getUserHomeDir()}/app`;
  const appDir = `${repoDir}/${APP_DIR}`;
  await run.step("clone", () =>
    sandbox.git.clone(REPO_URL, repoDir, undefined, undefined, undefined, undefined, undefined, 1),
  );
  await sandbox.process.createSession("shell");
  await run.step("install", () => sh(appDir, INSTALL));
  await run.step("build", () => sh(appDir, BUILD));

  await sandbox.process.createSession("server");
  await sandbox.process.executeSessionCommand("server", {
    command: `cd ${appDir} && ${START}`,
    runAsync: true,
  });
  const { url } = await sandbox.getPreviewLink(PORT);
  console.log(await run.step("start", () => waitForHealth(url)));

  await hold(url);
} finally {
  await run.step("delete sandbox", () => sandbox.delete());
  run.summary();
}
