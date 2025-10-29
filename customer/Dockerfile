# syntax=docker/dockerfile:1.4

FROM node:20.12.2-alpine3.19 AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY test ./test
COPY .eslintrc.js .prettierrc ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:20.12.2-alpine3.19 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
