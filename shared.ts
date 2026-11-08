// What every runner shares: the same repo, commands, hold time and reporting,
// so the three providers are compared on identical work.

export const REPO_URL =
  process.env.REPO_URL ?? "https://github.com/SiebeBaree/cloud-sandbox-test.git";
/** The Next.js app's folder inside the cloned repo. */
export const APP_DIR = "demo-app";
export const PORT = 3000;
/** How long the app stays up after it answers, so you can open it in a browser. */
export const HOLD_SECONDS = Number(process.env.HOLD_SECONDS ?? 60);

export const INSTALL = "npm ci --no-audit --no-fund";
export const BUILD = "npm run build";
export const START = `npm start -- -p ${PORT}`;

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Env vars the app needs inside the sandbox. */
export function appEnv(provider: string) {
  return {
    DATABASE_URL: requireEnv("DATABASE_URL"),
    SANDBOX_PROVIDER: provider,
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

/** Times each step of a run and prints the totals at the end. */
export function createRun(provider: string) {
  const started = performance.now();
  const steps: { step: string; seconds: number }[] = [];
  console.log(`\n${provider}: ${REPO_URL}\n`);

  return {
    async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
      console.log(`\n▶ ${name}`);
      const t = performance.now();
      const result = await fn();
      const seconds = (performance.now() - t) / 1000;
      steps.push({ step: name, seconds: Number(seconds.toFixed(1)) });
      console.log(`✓ ${name} (${seconds.toFixed(1)}s)`);
      return result;
    },
    summary() {
      const total = (performance.now() - started) / 1000;
      console.log(`\n${provider} summary`);
      console.table([...steps, { step: "total", seconds: Number(total.toFixed(1)) }]);
    },
  };
}

/** Polls the app's health endpoint through the provider's public URL until it answers. */
export async function waitForHealth(baseUrl: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) return (await res.json()) as unknown;
      lastError = `HTTP ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`${baseUrl} never became healthy: ${lastError}`);
}

/** Keeps the sandbox alive for HOLD_SECONDS, checking health every 15s. */
export async function hold(baseUrl: string) {
  console.log(`\n  Open ${baseUrl}\n  Staying up for ${HOLD_SECONDS}s\n`);
  for (let left = HOLD_SECONDS; left > 0; left -= 15) {
    await new Promise((r) => setTimeout(r, Math.min(15, left) * 1_000));
    const res = await fetch(`${baseUrl}/api/health`).catch(() => null);
    console.log(`  ${Math.max(left - 15, 0)}s left, health ${res?.status ?? "unreachable"}`);
  }
}

/** Runs cleanup on Ctrl+C so an interrupted run does not leak a sandbox. */
export function cleanupOnInterrupt(cleanup: () => Promise<unknown>) {
  process.once("SIGINT", async () => {
    console.log("\nInterrupted, removing sandbox");
    await cleanup().catch(console.error);
    process.exit(130);
  });
}
