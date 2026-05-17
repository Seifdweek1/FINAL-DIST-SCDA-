FROM node:20-alpine

# Prisma on Alpine needs OpenSSL libs; avoids wrong engine / runtime surprises
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

# Migrations run at container start (see src/server.js: prisma migrate deploy) when DATABASE_URL is available.
# Install runs as root; CMD runs as node — Prisma migrate may write under node_modules/@prisma; chown fixes:
#   Error: Can't write to /app/node_modules/@prisma/engines
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

USER node

CMD ["node", "src/server.js"]
