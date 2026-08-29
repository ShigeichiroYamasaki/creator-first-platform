FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY apps/gateway ./apps/gateway

USER node
CMD ["node", "apps/gateway/src/index.js"]
