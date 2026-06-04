FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json nx.json tsconfig.base.json tsconfig.json ./
COPY apps/web-admin ./apps/web-admin
COPY libs ./libs

RUN npm ci --legacy-peer-deps
RUN npx nx build web-admin --configuration=production

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4201

COPY --from=builder /app/dist/apps/web-admin/.next/standalone ./
COPY --from=builder /app/dist/apps/web-admin/.next/static ./dist/apps/web-admin/.next/static
COPY --from=builder /app/dist/apps/web-admin/public ./apps/web-admin/public

EXPOSE 4201

CMD ["node", "apps/web-admin/server.js"]
