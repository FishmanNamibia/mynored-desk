# Northflank free testing setup

## Best free testing option

If you want to test this repo on one provider with one public app URL, Northflank Sandbox is the best current fit.

Why this is the best free testing target for this repo:

- Northflank Sandbox includes:
  - 2 free services
  - 1 free database
  - always-on compute
- This repo already works with:
  - one public Next.js web service
  - one private Nest API service
  - one PostgreSQL database
- Redis is optional for testing because the API now falls back to in-memory sessions if `REDIS_URL` is not set.

That means the free Sandbox layout matches this app well:

- public service: `mynored-desk-web`
- private service: `mynored-desk-api`
- free database: PostgreSQL addon

## Quick start

If you just want the shortest path, do this:

1. Create one Northflank project
2. Add one PostgreSQL addon
3. Add one private API service from this repo
4. Add one public web service from this repo
5. Set `INTERNAL_API_URL=http://mynored-desk-api:34567` on the web service
6. Set `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_WEB_URL` to the web service domain
7. Set `CORS_ORIGIN` on the API to that same web service domain
8. Open only the web service URL in the browser

## Important limitation

This is a testing setup, not production:

- memo files stored by the API should be treated as temporary on a free setup
- API sessions will use in-memory fallback if you do not add Redis
- the API package still has unrelated TypeScript compile issues, so it is run with `ts-node --transpile-only`

## Project layout on Northflank

Create one Northflank project with:

1. `mynored-desk-db` as a PostgreSQL addon
2. `mynored-desk-api` as a private service
3. `mynored-desk-web` as the only public service

Only expose the web service publicly.

The API service should expose a private port only, so users only ever open the UI URL.

## Database addon

Create a PostgreSQL addon and inject its `DATABASE_URL` into both services.

Suggested addon name:

- `mynored-desk-db`

## API service

Create a service from the repo root with:

- Build method: Git repository
- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @mynsa-desk/database build
```

- Start command:

```bash
pnpm --filter my-nsa-desk-api exec ts-node --transpile-only src/main.ts
```

- Working directory:

```text
/workspace
```

- Private port:

```text
34567
```

- Do not expose this service publicly

Optional if you prefer Docker deploys:

- Dockerfile: `docker/api.Dockerfile`

### API environment variables

- `NODE_ENV=production`
- `PORT=34567`
- `DATABASE_URL=<from Northflank PostgreSQL addon>`
- `JWT_SECRET=<generate a long random secret>`
- `JWT_EXPIRES_IN=15m`
- `CORS_ORIGIN=https://<your-web-service-domain>`
- `MEMO_STORAGE_DIR=/workspace/apps/api/public/generated_memos`

Optional:

- `REDIS_URL=` leave unset for free testing
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `COOKIE_DOMAIN`

## Web service

Create a second service from the repo root with:

- Build method: Git repository
- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @mynsa-desk/database build && pnpm --filter @mynsa-desk/web build
```

- Start command:

```bash
pnpm --filter @mynsa-desk/web exec next start --hostname 0.0.0.0 --port $PORT
```

- Working directory:

```text
/workspace
```

- Public HTTP port:

```text
$PORT
```

Optional if you prefer Docker deploys:

- Dockerfile: `docker/Dockerfile`

### Web environment variables

- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `DATABASE_URL=<from Northflank PostgreSQL addon>`
- `INTERNAL_API_URL=http://mynored-desk-api:34567`
- `NEXTAUTH_SECRET=<generate a long random secret>`
- `NEXTAUTH_URL=https://<your-web-service-domain>`
- `NEXT_PUBLIC_APP_URL=https://<your-web-service-domain>`
- `NEXT_PUBLIC_WEB_URL=https://<your-web-service-domain>`

Optional:

- `NEXT_PUBLIC_API_URL=` leave unset
- `REDIS_URL=` leave unset for free testing
- `NEXT_PUBLIC_AZURE_TENANT_ID`
- `NEXT_PUBLIC_AZURE_CLIENT_ID`
- `NEXT_PUBLIC_AZURE_REDIRECT_URI`
- `NEXT_PUBLIC_AZURE_API_SCOPE`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Why this gives you one public URL

The browser only needs the web service URL.

The web app is already configured to:

- proxy browser `/api/*` requests through the web app
- talk to the API internally with `INTERNAL_API_URL`
- keep auth cookies on the web app domain

So your users open only:

- `https://<your-web-service-domain>`

And never need to visit the API service directly.

## What to verify after deploy

1. Open the web service URL
2. Confirm the login page loads
3. Confirm the API health check works through the private API service
4. Log in and test a request flow
5. Generate a memo and confirm the download works

## Fallback if Northflank does not work for you

If you want the simplest non-free fallback, use Railway:

- Railway free trial gives a one-time `$5` credit for up to 30 days, then a free plan with `$1` monthly credit
- it supports code and databases in one provider
- it is easier to onboard than most platforms, but it is not a durable forever-free option for this stack

## Official references

- Northflank pricing: [https://northflank.com/pricing](https://northflank.com/pricing)
- Northflank Git repo builds: [https://northflank.com/docs/v1/application/build/build-code-from-a-git-repository](https://northflank.com/docs/v1/application/build/build-code-from-a-git-repository)
- Northflank ports and public/private exposure: [https://northflank.com/docs/v1/application/network/configure-ports](https://northflank.com/docs/v1/application/network/configure-ports)
