# cloud-sandbox-test

Runs the same job on Daytona, Vercel Sandbox and Boat. Each runner clones this repo, installs and builds `demo-app`, starts it, keeps it up for 60 seconds and then deletes the sandbox. Every provider gets 2 vCPU and 4 GB.

`demo-app` is Thirsty, a Next.js app that tracks which house plants need water. The plants live in Neon. The Water button writes to the database and records which provider served the click, so you can open the app locally afterwards and see `by daytona`, `by vercel` or `by boat` in the list.

## Setup

```sh
pnpm install
cp .env.example .env                    # provider keys and DATABASE_URL
cp demo-app/.env.example demo-app/.env  # DATABASE_URL again, for the app itself
cd demo-app && npm install && npm run db:seed && npm run dev
```

`db:seed` drops and recreates the `plants` table.

For Vercel, `vercel link && vercel env pull .env.local` writes a `VERCEL_OIDC_TOKEN` that the runner picks up. The token lasts about 12 hours, so pull it again when it expires.

## Run

```sh
pnpm daytona
pnpm vercel
pnpm boat
```

Each run streams the install and build output, prints the app's public URL and the `/api/health` response, then prints a timing table:

```
┌─────────┬──────────────────┬─────────┐
│ (index) │ step             │ seconds │
├─────────┼──────────────────┼─────────┤
│ 0       │ create sandbox   │ ...     │
│ 1       │ clone            │ ...     │
│ 2       │ install          │ ...     │
│ 3       │ build            │ ...     │
│ 4       │ start            │ ...     │
│ 5       │ delete sandbox   │ ...     │
│ 6       │ total            │ ...     │
└─────────┴──────────────────┴─────────┘
```

Vercel clones the repo while it creates the sandbox, so its first step covers both. `start` ends when `/api/health` answers through the public URL, which includes a real Neon query from inside the sandbox.

`HOLD_SECONDS=300 pnpm boat` keeps the app up longer. Ctrl+C deletes the sandbox. If the script dies anyway, Vercel and Boat stop the sandbox after 15 minutes and Daytona after 15 idle minutes.

The repo must be public, or the sandboxes can't clone it. Set `REPO_URL` to use a different one.
