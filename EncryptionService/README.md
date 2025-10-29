# Encryption Service (Spring Boot)

This Kotlin/Spring Boot application exposes a gRPC API for encrypting and decrypting payloads. It is built to run in two modes:

- **AWS KMS** – when supplied with a KMS key id and valid AWS credentials.
- **Local AES-GCM** – for development and testing, using a base64-encoded symmetric key.

## Features

- gRPC server generated from `src/main/proto/encryption.proto`.
- Coroutine-based service implementation (`EncryptionService.kt`).
- Pluggable key management via `EncryptionManager`.
- Ready for containerisation (Dockerfile) and Kubernetes deployment (see `helm/encryption`).

## Running Locally

```bash
cd EncryptionService
export ENCRYPTION_LOCAL_KEY=$(openssl rand -base64 32)
./gradlew bootRun
```

The service listens on port `9090`. Point the customer API at `localhost:9090` to exercise the integration.

### Using AWS KMS

```bash
export ENCRYPTION_KMS_KEY_ID=<kms-key-id>
export AWS_ACCESS_KEY_ID=<access-key>
export AWS_SECRET_ACCESS_KEY=<secret-key>
export AWS_REGION=<region>  # optional, defaults to us-east-1
./gradlew bootRun
```

`EncryptionManager` prefers the key id present in the gRPC request but falls back to `ENCRYPTION_KMS_KEY_ID` when nothing is supplied.

## Useful Tasks

- `./gradlew bootRun` – start the service.
- `./gradlew test` – run unit tests.
- `./gradlew clean build` – produce a runnable JAR.
- `./gradlew bootBuildImage` – build an OCI image using Cloud Native Buildpacks.

## Configuration Keys

| Property / Env Var          | Description                                                       |
|-----------------------------|-------------------------------------------------------------------|
| `encryption.region`         | AWS region for KMS (default `us-east-1`).                         |
| `encryption.kms-key-id`     | KMS key identifier. Enables AWS-backed encryption mode.           |
| `encryption.local-key`      | Base64-encoded AES key (128/192/256 bit). Enables local fallback. |

Provide at least one of `encryption.kms-key-id` or `encryption.local-key`. Credentials are resolved via the default AWS SDK provider chain.

> The Helm chart sets a demo `ENCRYPTION_LOCAL_KEY` for convenience. Always override it (for example with `--set env.secret.ENCRYPTION_LOCAL_KEY="$(openssl rand -base64 32)"`) before deploying anywhere outside a local cluster.
