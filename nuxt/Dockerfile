# Nuxt 3 frontend for CapRover (built from the repo root via ../captain-definition).
#
# Build-time:  DIRECTUS_URL is the PUBLIC Directus origin. It is baked into browser asset URLs,
#              the CSP and @nuxt/image, and the redirects module reads it during `nuxt build`.
# Runtime:     NUXT_DIRECTUS_SERVER_URL sends SSR / API-route requests over the internal Docker
#              network instead of the public hostname.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY nuxt/package.json nuxt/pnpm-lock.yaml nuxt/pnpm-workspace.yaml nuxt/.npmrc ./
COPY nuxt/patches ./patches
RUN NUXT_PREPARE=true pnpm install --frozen-lockfile

COPY nuxt/ ./

ARG DIRECTUS_URL=https://mitsubishi-api.ifusionlab.work
ARG NUXT_PUBLIC_SITE_URL
ENV DIRECTUS_URL=$DIRECTUS_URL \
    NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_DIRECTUS_SERVER_URL=http://srv-captain--mitsubishi-api:8055
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
