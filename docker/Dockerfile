FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .node-version .npmrc ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mynsa-desk/database build
RUN pnpm --filter @mynsa-desk/web build

FROM node:22-bookworm-slim AS runner

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

WORKDIR /workspace

COPY --from=build /workspace /workspace

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @mynsa-desk/web exec next start --hostname 0.0.0.0 --port ${PORT:-3000}"]
