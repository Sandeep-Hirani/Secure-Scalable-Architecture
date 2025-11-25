# Secure & Scalable Architecture Template

This repository demonstrates a small but production-flavoured architecture composed of two cooperating services:

- `EncryptionService` – a Kotlin/Spring Boot gRPC server that encrypts and decrypts payloads either via AWS KMS or a local AES-GCM key.
- `customer` – a NestJS service that exposes both REST and GraphQL APIs, persists customer records in PostgreSQL via TypeORM, and relies on the encryption service to protect sensitive fields at rest.

Helm charts for both services (plus optional observability components) are included to illustrate a ready-to-deploy Kubernetes footprint.

## Repository Layout

- `EncryptionService/` – Spring Boot gRPC service, Gradle build, Dockerfile.
- `customer/` – NestJS application with REST + GraphQL endpoints, TypeORM migrations, Dockerfile.
- `helm/` – Helm charts for the customer and encryption services, APISIX gateway samples, and observability add-ons.

Each service also ships with a local README for deeper framework-specific guidance.

## Prerequisites

- Node.js 20+ and npm 9+.
- Java 17+ (the Gradle wrapper ships with the correct distribution).
- PostgreSQL 14+ (a Docker container works fine).
- `protoc` when you plan to re-generate protobuf artefacts manually (the repo already contains generated code).

## Quick Start (Local Development)

1. **Start PostgreSQL** (Docker example):

   ```bash
   docker run --name customer-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
   ```

2. **Run the encryption service** (local AES-GCM key):

   ```bash
   cd EncryptionService
   export ENCRYPTION_LOCAL_KEY=$(openssl rand -base64 32)
   ./gradlew bootRun
   ```

   The service listens for gRPC requests on `localhost:9090` by default. To use AWS KMS instead, set `encryption.kms-key-id` (or the `ENCRYPTION_KMS_KEY_ID` env var) and provide AWS credentials through the standard provider chain.

3. **Configure and start the customer service**:

   ```bash
   cd customer
   cp .env.example .env.development
   # update database/encryption URLs if needed
   npm install
   npm run migration:run
   npm run start:dev
   ```

   REST endpoints (e.g. `GET /customers/:id`, `GET /customers/:id/decrypted`, `POST /customers/create`) and GraphQL playground (`http://localhost:3000/graphql`) will be available once the service starts.

## GraphQL Sample Queries

Use the following snippets inside the GraphQL playground to exercise the API quickly.

### Create a customer

```graphql
mutation CreateCustomer($input: CreateCustomerInput!) {
  createCustomer(input: $input) {
    id
    firstName
    lastName
    status
  }
}
```

Variables:

```json
{
  "input": {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "status": "ACTIVE"
  }
}
```

### Fetch a customer by ID

```graphql
query CustomerById($id: String!) {
  customer(id: $id) {
    id
    firstName
    lastName
    status
  }
}

query DecryptedCustomerById($id: String!) {
  decryptedCustomer(id: $id) {
    id
    firstName
    lastName
    status
  }
}
```

Variables:

```json
{
  "id": "your-customer-id"
}
```

## Demo: Minikube Presentation Flow

The following sequence was used to present the full stack on a local Minikube cluster. Adjust namespaces or chart values as needed.

1. **Seed PostgreSQL via Bitnami Helm chart**

   ```bash
   export PG_USER=postgres
   export PG_PASS=postgres
   export PG_DB=postgres

   kubectl create namespace db

   helm repo add bitnami https://charts.bitnami.com/bitnami

   helm install my-postgres bitnami/postgresql -n db \
     --set auth.postgresPassword="$PG_PASS" \
     --set auth.database="$PG_DB" \
     --set primary.persistence.enabled=true \
     --set primary.persistence.size=10Gi

   # The customer Helm chart expects the same postgres/postgres credentials by default.
   ```

2. **Build and load the customer service image**

   ```bash
   pushd customer
   docker build -t customer:latest .
   minikube image load customer:latest
   popd
   ```

   Deploy the chart:

   ```bash
   helm upgrade --install customer ./helm/customer \
     -n customer --create-namespace

   kubectl -n customer get pods -l app.kubernetes.io/name=customer
   ```

3. **Build, load, and deploy the encryption service**

   ```bash
   pushd EncryptionService
   ./gradlew build
   docker build -t encryption:latest .
   minikube image load encryption:latest
   popd

   helm upgrade --install encryption ./helm/encryption \
     -n customer

   # (Optional) Rotate the demo local key
   # helm upgrade --install encryption ./helm/encryption \
   #   -n customer \
   #   --set env.secret.ENCRYPTION_LOCAL_KEY="$(openssl rand -base64 32)"

   kubectl -n customer get pods -l app.kubernetes.io/name=encryption
   ```

4. **Install APISIX as an ingress gateway**

   ```bash
   helm repo add apisix https://charts.apiseven.com

   helm upgrade --install apisix apisix/apisix \
     -n apisix --create-namespace \
     --version 2.10.0 \
     -f helm/APISIX/apisix-old.yaml \
     --set service.type=NodePort \
     --set service.externalTrafficPolicy=Cluster
   ```

   Service discovery example: `customer-customer.customer.svc.cluster.local:6004`.

5. **Install observability stack**

   ```bash
   helm repo add grafana https://grafana.github.io/helm-charts
   helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update

   helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
     -n observability --create-namespace \
     --set grafana.enabled=false

   helm upgrade --install grafana grafana/grafana -n observability --set adminPassword=admin

   helm upgrade --install loki grafana/loki \
     -n observability -f helm/otel/loki-values.yaml

   helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
     -n observability -f helm/otel/otel-values.yaml

   kubectl apply -f helm/otel/servicemonitor.yaml
   ```

   Validate collector pods:

   ```bash
   kubectl -n observability get pods -l app.kubernetes.io/name=opentelemetry-collector
   ```

   Optional Loki check:

   ```bash
   kubectl -n observability get pods -l app.kubernetes.io/name=loki
   ```

   Prometheus ServiceMonitor:

   ```bash
   kubectl -n observability get servicemonitor customer

   # Optional: access Grafana locally
   # kubectl -n observability port-forward svc/grafana 3001:80
   ```

   Prometheus endpoint example: `http://kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090`.

## Observability

- Prometheus metrics are exposed by the customer service at `GET /metrics`.
- OpenTelemetry auto-instrumentation starts by default; adjust the `OTEL_*` environment variables or set `OTEL_SDK_DISABLED=true` if you need to disable it in a given environment.
- Logs flow through the OpenTelemetry Collector into Loki using the provided Helm values.
- Traces are emitted through the collector's debug exporter by default; wire in Tempo, Jaeger, etc. by extending `helm/otel/otel-values.yaml`.
- The `helm/otel` directory contains manifests for Prometheus, Loki, and the OpenTelemetry collector tailored for this template.

## Kubernetes Deployment

Helm charts live under `helm/`:

- `helm/customer` – Deploys the NestJS customer API.
- `helm/encryption` – Deploys the Kotlin encryption service.
- `helm/APISIX` – Optional API gateway examples.
- `helm/otel` – Observability stack components.

Example install (customer namespace):

```bash
helm upgrade --install encryption-service ./helm/encryption -n customer --create-namespace
helm upgrade --install customer-service ./helm/customer -n customer
```

Review the `values.yaml` files before deploying to inject real secrets (for example, supply the gRPC endpoint, database credentials, and encryption keys via Kubernetes secrets).

## Testing & Tooling

- `customer` service:
  - `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run proto:generate`.
- `EncryptionService`:
  - `./gradlew test`, `./gradlew bootRun`, `./gradlew clean build`.

## Security Considerations

- Encryption keys should never be committed to source control—use environment variables or secret stores.
- In production, enable TLS for the gRPC connection (currently configured for insecure localhost traffic).
- Database credentials and other secrets should be delivered via a secrets manager (Vault, AWS Secrets Manager, etc.); the Helm charts expect Kubernetes secrets by default.

## License

Distributed under the MIT License. See `LICENSE` for details.
