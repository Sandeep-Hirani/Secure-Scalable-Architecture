import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { credentials } from '@grpc/grpc-js';
import { CLOUD_COMPUTING_ENCRYPTION_PACKAGE_NAME, ENCRYPTION_SERVICE_NAME } from './__protos__/__generated__/src/__protos__/customer/encryption.pb';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './app-types/entities/customer/customer.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './config/app.config';
import * as path from 'path';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { APP_INTERCEPTOR } from '@nestjs/core';

import dbConfig from './config/database.config';
import { AppResolver } from './app.resolver';
import { AppController } from './app.controller';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { HttpMetricsInterceptor } from './metrics/http-metrics.interceptor';
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: path.join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    TypeOrmModule.forFeature([Customer]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          ...configService.get('database'),
        };
      },
    }),
    ConfigModule.forRoot({
      load: [
        appConfig,
        dbConfig,
      ],
      isGlobal: true,
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    ClientsModule.register([
      {
        name: ENCRYPTION_SERVICE_NAME,
        transport: Transport.GRPC,
        options: {
          url: process.env.ENCRYPTION_URL,
          package: CLOUD_COMPUTING_ENCRYPTION_PACKAGE_NAME,
          protoPath: [
            //  `${process.cwd()}/encryption.proto`
            path.join(__dirname, 'encryption.proto')
          ],
          credentials: credentials.createInsecure(),
        },

      },
    ]),
  ],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    makeCounterProvider({
      name: 'http_server_requests_total',
      help: 'Total number of HTTP requests handled by the server',
      labelNames: ['method', 'route', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_server_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
  ],
  controllers: [AppController]
})
export class AppModule { }
