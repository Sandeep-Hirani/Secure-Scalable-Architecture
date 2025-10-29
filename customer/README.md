# Customer Service (NestJS)

This project is a small customer service built with NestJS. It exposes both REST and GraphQL APIs, persists customer records in PostgreSQL via TypeORM, integrates with a gRPC encryption service, and emits Prometheus and OpenTelemetry telemetry.

## Features

- CRUD-style customer access through REST (e.g. `GET /customers/:id`, `GET /customers/:id/decrypted`) and GraphQL operations.
- TypeORM integration with PostgreSQL and migration support.
- gRPC client used to encrypt and decrypt customer names before storage.
- Prometheus-ready HTTP metrics exposed at `/metrics`.
- Optional OpenTelemetry SDK bootstrapping for traces.

## Prerequisites

- Node.js 20+
- npm 9+
- A PostgreSQL instance (local Docker is fine)
- (Optional) A gRPC encryption service compatible with `src/encryption.proto`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and adjust it for your setup:

   ```bash
   cp .env.example .env.development
   ```

3. Start the database and encryption dependencies you need (Docker Compose, local binaries, etc.).

4. Run the application in watch mode:

   ```bash
   npm run start:dev
   ```

   The HTTP server listens on port `3000` by default.

5. (Optional) Apply database migrations when you connect to a clean database:

   ```bash
   npm run migration:run
   ```

## Useful Scripts

- `npm run start` – run the app with ts-node (used for local development).
- `npm run start:prod` – run the compiled app from `dist`.
- `npm run build` – create a production build.
- `npm run lint` / `npm run test` / `npm run test:e2e` – quality gates.
- `npm run proto:generate` – regenerate TypeScript stubs from the protobuf definitions.

## Environment Variables

`ConfigModule` loads variables from `.env.${NODE_ENV}` (defaults to `.env.development`). The `.env.example` file documents the required keys:

- Application basics – `APP_NAME`, `APP_BASE_URL`, `ALLOWED_ORIGINS`.
- Database connection – `DATABASE_*` variables.
- Encryption service – `ENCRYPTION_URL`.
- Observability – `OTEL_*` settings (defaults target localhost tooling).

Do not commit real secrets. Keep personal copies of `.env.development` out of source control (it's listed in `.gitignore`).

## Telemetry

- Prometheus metrics are served under `GET /metrics`.
- OpenTelemetry auto-instrumentation is enabled by default; configure the `OTEL_*` environment variables or set `OTEL_SDK_DISABLED=true` to turn it off.
- The provided Helm values forward logs to Loki and emit traces via the collector's debug exporter; tailor the exporter list for your target observability stack.

## Docker Image

A multi-stage Dockerfile is provided. Build the image from the project root:

```bash
docker build -t customer-service:latest .
```

Run it with the environment variables the service needs.
