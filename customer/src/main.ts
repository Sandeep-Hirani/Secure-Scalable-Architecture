import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startTelemetry } from './telemetry';

async function bootstrap() {
  await startTelemetry();
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
}
bootstrap();
