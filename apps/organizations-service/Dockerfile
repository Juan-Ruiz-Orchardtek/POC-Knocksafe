FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/organizations-service ./apps/organizations-service
COPY libs ./libs

RUN npm ci --legacy-peer-deps
RUN npx nx build organizations-service --configuration=production

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/organizations-service ./

RUN npm ci --omit=dev

ENV PORT=3002
EXPOSE 3002

CMD ["node", "main.js"]
