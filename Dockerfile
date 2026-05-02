# Multi-stage so devDeps (Vite, Vitest, Cypress, types, …) never enter the
# runtime image. The previous single-stage Dockerfile baked Cypress into the
# production image and exhausted the EC2 host's 16GB disk after a few deploys.
FROM node:lts AS builder
WORKDIR /clubsoft-website
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:lts AS runtime
WORKDIR /clubsoft-website
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force
COPY --from=builder /clubsoft-website/dist ./dist
COPY server.mjs ./server.mjs
COPY server ./server
# server.mjs imports the FuPa Lambda handler directly to back /api/fupa/*
COPY infrastructure/lambda/fupa.mjs ./infrastructure/lambda/fupa.mjs
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NPM_CONFIG_LOGLEVEL=info
EXPOSE 4321
# Env vars come from compose (env_file: .runtime.env) so the secret never
# enters an image layer. `node --env-file` would require the file inside the
# image and contradict the .dockerignore.
CMD ["node", "server.mjs"]
