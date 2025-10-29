import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

type OtelLogLevel = keyof typeof DiagLogLevel;

let sdk: NodeSDK | undefined;
let started = false;

const logLevelMap: Record<string, OtelLogLevel> = {
  ALL: 'ALL',
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  NONE: 'NONE',
};

const signalHandlers = new Set<string>();

function configureDiagnostics() {
  const envLevel = process.env.OTEL_LOG_LEVEL?.toUpperCase() ?? 'WARN';
  const logLevel = logLevelMap[envLevel] ?? 'WARN';

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel[logLevel]);
}

function buildTraceExporter() {
  const baseEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, '') ||
    'http://localhost:4318';
  const exporterUrl = `${baseEndpoint}/v1/traces`;

  const headersRaw = process.env.OTEL_EXPORTER_OTLP_HEADERS;

  const exporterOptions: ConstructorParameters<typeof OTLPTraceExporter>[0] = {
    url: exporterUrl,
  };

  if (headersRaw) {
    const headerEntries = headersRaw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split('=').map((value) => value.trim()))
      .filter((pair): pair is [string, string] => pair.length === 2 && pair[0].length > 0);

    if (headerEntries.length > 0) {
      exporterOptions.headers = Object.fromEntries(headerEntries);
    }
  }

  return new OTLPTraceExporter(exporterOptions);
}

function buildResource() {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'customer-service';
  const serviceNamespace = process.env.OTEL_SERVICE_NAMESPACE || 'customer';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || '0.0.1';

  return resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  });
}

function shouldStartSdk() {
  if (process.env.OTEL_SDK_DISABLED === 'true') {
    return false;
  }

  if ((process.env.OTEL_TRACES_EXPORTER || '').toLowerCase() === 'none') {
    return false;
  }

  return true;
}

async function registerSignalHandlers() {
  const shutdownSignals = ['SIGTERM', 'SIGINT'];

  for (const signal of shutdownSignals) {
    if (signalHandlers.has(signal)) {
      continue;
    }

    const handler = async () => {
      try {
        await sdk?.shutdown();
      } catch (error) {
        diag.error('Telemetry shutdown failed', error);
      } finally {
        process.exit(0);
      }
    };

    process.once(signal, handler);
    signalHandlers.add(signal);
  }
}

export async function startTelemetry() {
  if (started || !shouldStartSdk()) {
    return;
  }

  configureDiagnostics();

  sdk =
    sdk ||
    new NodeSDK({
      resource: buildResource(),
      traceExporter: buildTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });

  await sdk.start();
  await registerSignalHandlers();
  started = true;
}
