FROM node:lts AS runtime
WORKDIR /clubsoft-website

COPY . .

RUN npm install
RUN npm run build
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NPM_CONFIG_LOGLEVEL info
EXPOSE 4321
CMD npm run serve