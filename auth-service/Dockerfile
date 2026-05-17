FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat python3 make g++

COPY package.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

USER node

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
