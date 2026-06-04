FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/web-client ./apps/web-client
COPY libs ./libs

RUN npm ci --legacy-peer-deps
RUN npx nx build web-client --configuration=production

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4200

COPY --from=builder /app/dist/apps/web-client/.next/standalone ./
COPY --from=builder /app/dist/apps/web-client/.next/static ./dist/apps/web-client/.next/static
COPY --from=builder /app/dist/apps/web-client/public ./apps/web-client/public

EXPOSE 4200

CMD ["node", "apps/web-client/server.js"]
