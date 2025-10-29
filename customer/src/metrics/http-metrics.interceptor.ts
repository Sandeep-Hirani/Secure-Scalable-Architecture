import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

type Labels = {
  method: string;
  route: string;
  status: string;
};

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_server_requests_total')
    private readonly httpRequestCounter: Counter<string>,
    @InjectMetric('http_server_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (!request || !response) {
      return next.handle();
    }

    const labels = this.buildLabels(request, response);
    const startTime = process.hrtime.bigint();
    let recorded = false;

    const record = () => {
      if (recorded) {
        return;
      }

      recorded = true;
      this.recordMetrics(labels, startTime, response);
    };

    response.once('finish', record);
    response.once('close', record);

    return next.handle();
  }

  private buildLabels(request: Request, response: Response): Labels {
    const method = request.method || 'UNKNOWN';
    const status = String(response.statusCode || 500);
    const route =
      request.route?.path ||
      request.baseUrl ||
      request.originalUrl?.split('?')[0] ||
      request.url?.split('?')[0] ||
      'unknown';

    return { method, route, status };
  }

  private recordMetrics(labels: Labels, startTime: bigint, response: Response) {
    const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1_000_000_000;
    const status = String(response.statusCode || labels.status);

    this.httpRequestCounter.inc({ ...labels, status });
    this.httpRequestDuration.observe({ ...labels, status }, durationSeconds);
  }
}
