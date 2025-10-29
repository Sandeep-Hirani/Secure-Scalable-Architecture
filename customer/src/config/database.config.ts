/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import { NotFoundException } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export interface IDatabaseConfig {
  type: string;
  host: string;
  port: number;
  password: string;
  name: string;
  database: string;
  username: string;
  cli: object;
  entities: string[];
  migrations: string[];
  migrationsTableName: string;
  extra: {
    max: number;
  };
  logging: boolean;
  schema?: string;
  migrationsRun: boolean;
}

export const getDatabaseConfig = (): IDatabaseConfig => {
  const requiredVariables = [
    'DATABASE_TYPE',
    'DATABASE_HOST',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'DATABASE_USERNAME',
    'DATABASE_SCHEMA',
  ] as const;

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable],
  );

  if (missingVariables.length > 0) {
    throw new NotFoundException(
      `Missing database environment variables: ${missingVariables.join(', ')}`,
    );
  }

  return {
    type: process.env.DATABASE_TYPE as string,
    host: process.env.DATABASE_HOST as string,
    port: parseInt(process.env.DATABASE_PORT || '', 10) || 5432,
    password: process.env.DATABASE_PASSWORD as string,
    name: process.env.DATABASE_NAME as string,
    database: process.env.DATABASE_NAME as string,
    username: process.env.DATABASE_USERNAME as string,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsTableName: 'migration',
    logging: process.env.NODE_ENV !== 'production',
    cli: {
      entitiesDir: 'src',
      migrationsDir: 'src/migrations',
    },
    extra: {
      // based on https://node-postgres.com/api/pool
      // max connection pool size
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '', 10) || 100,
    },
    schema: process.env.DATABASE_SCHEMA,
    migrationsRun: process.env.DATABASE_SYNCHRONIZE === 'true',
  };
};
export default registerAs('database', (): IDatabaseConfig => {
  return getDatabaseConfig();
});
