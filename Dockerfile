FROM node:16-slim as base
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package.json
COPY src/ src/
COPY bin/ bin/

RUN npm i -g @vercel/ncc && npm install
RUN ln -s /app/bin/bev /usr/local/bin/validate-entity
