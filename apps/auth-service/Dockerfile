FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/auth-service ./apps/auth-service
COPY libs ./libs

RUN npm ci --legacy-peer-deps
RUN npx nx build auth-service --configuration=production

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/auth-service ./

RUN npm ci --omit=dev

ENV PORT=3001
EXPOSE 3001

CMD ["node", "main.js"]
