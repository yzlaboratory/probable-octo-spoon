FROM node:lts AS runtime
WORKDIR /clubsoft-website

COPY . .

RUN npm install --legacy-peer-deps
RUN npm run build
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NPM_CONFIG_LOGLEVEL=info
EXPOSE 4321
# Env vars come from compose (env_file: .runtime.env) so the secret never
# enters an image layer. `node --env-file` would require the file inside the
# image and contradict the .dockerignore.
CMD ["node", "server.mjs"]