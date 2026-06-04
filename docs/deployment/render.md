# Render deployment

## Recommended stack

This repo is configured for a full-stack Render deployment:

- `mynored-desk-web`: Next.js web app
- `mynored-desk-api`: NestJS API
- `mynored-desk-db`: Render Postgres
- `mynored-desk-cache`: Render Key Value

This is the recommended testing setup for this repo because it keeps the web app and API on always-on services, preserves websocket support, supports Prisma/Postgres directly from the web app, and avoids browser auth issues by routing browser API traffic through the web origin.

## Important repo-specific choices

- The web app does not use Render `rootDir`.
  This monorepo depends on shared workspace packages in `packages/*`, so the build commands run from the repo root.
- The web app uses same-origin `/api/*` and `/generated_memos/*` routes.
  This keeps auth cookies on the web domain instead of depending on cross-subdomain cookies.
- The API mounts a persistent disk for generated memo files.
  This makes generated `.docx` files survive restarts and redeploys.
- The API service starts with `ts-node --transpile-only`.
  That avoids unrelated existing TypeScript build errors in the API package while still allowing the service to run for testing.

## Before you deploy

During the Blueprint creation flow, Render will prompt for `sync: false` variables.

Use your actual web app URL for all of these:

- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WEB_URL`
- `CORS_ORIGIN`

If you keep the default service name from `render.yaml`, the web URL will usually be:

`https://mynored-desk-web.onrender.com`

If Render assigns a different URL, use that exact URL instead.

## Deploy steps

1. Push this repo to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint from the repo root.
3. Review the four resources in `render.yaml`.
4. Enter the prompted public web URL values.
5. Deploy the Blueprint.
6. After the first API deploy succeeds, Render will run `prisma migrate deploy` automatically before future API releases.

## Verify

After deploy:

- Open the web service URL and confirm the login page loads.
- Check the API health endpoint at `/api/health`.
- Generate a test memo and confirm the download works from the web URL.

## Optional environment variables

Add these only if you use the corresponding features:

- Azure SSO
  - Web: `NEXT_PUBLIC_AZURE_TENANT_ID`, `NEXT_PUBLIC_AZURE_CLIENT_ID`, `NEXT_PUBLIC_AZURE_REDIRECT_URI`, `NEXT_PUBLIC_AZURE_API_SCOPE`
  - API: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- Email
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- AI / Ollama
  - `OLLAMA_BASE_URL`, `OLLAMA_DEFAULT_MODEL`, `OLLAMA_MAX_TOKENS`, `OLLAMA_TEMPERATURE`
- Cross-subdomain cookies on a custom root domain
  - `COOKIE_DOMAIN`

## Cost-sensitive variant

If you want a cheaper smoke-test stack instead of the recommended testing stack:

- change Postgres from `basic-1gb` to `basic-256mb`
- change Key Value from `starter` to `free`

Keep the web and API services on `starter` if you want predictable uptime and the memo storage disk.
