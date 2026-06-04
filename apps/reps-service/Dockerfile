FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/reps-service ./apps/reps-service
COPY libs ./libs

RUN npm ci --legacy-peer-deps
RUN npx nx build reps-service --configuration=production

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist/apps/reps-service ./

RUN npm ci --omit=dev

ENV PORT=3003
EXPOSE 3003

CMD ["node", "main.js"]
