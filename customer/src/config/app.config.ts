import { NotFoundException } from '@nestjs/common';
import { registerAs } from '@nestjs/config';


export interface IAppConfig {
  nodeEnv?: string;
  name: string;
  workingDirectory: string;
  port: number;
  apiPrefix: string;
  fallbackLanguage: string;
  languageHeaderName: string;
  maxCOAFileSizeInMB: number;
  isDevMode: boolean;
  disableHttpsValidation: boolean;
  appBaseUrl: string;
  frontendUrl: string | undefined;
  allowedOrigins: string[];
  authTokensEarlyExpirySeconds: number;
}

const envVariableRequired = (variable: string): string =>
  `Missing required environment variable ${variable}`;

const envVariableInvalid = (variable: string): string =>
  `Environment variable ${variable} is invalid`;

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default registerAs('app', (): IAppConfig => {
  if (!process.env.APP_NAME) {
    throw new NotFoundException(envVariableRequired('APP_NAME'));
  }

  if (!process.env.APP_BASE_URL) {
    throw new NotFoundException(envVariableRequired('APP_BASE_URL'));
  }

  if (!process.env.ALLOWED_ORIGINS) {
    throw new NotFoundException(envVariableRequired('ALLOWED_ORIGINS'));
  }

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    throw new Error(envVariableInvalid('ALLOWED_ORIGINS'));
  }

  return {
    nodeEnv: process.env.NODE_ENV,
    name: process.env.APP_NAME,
    workingDirectory: process.env.PWD || process.cwd(),
    port: parseNumber(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX || '',
    appBaseUrl: process.env.APP_BASE_URL,
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
    languageHeaderName: process.env.APP_LANGUAGE_HEADER_NAME || 'x-custom-lang',
    isDevMode: (process.env.NODE_ENV || '').toLowerCase() !== 'production',
    disableHttpsValidation:
      process.env.DISABLE_AXIOS_HTTPS_VERIFICATION === 'true',
    maxCOAFileSizeInMB: parseNumber(process.env.MAX_COA_FILE_SIZE_IN_MBS, 0.5),
    allowedOrigins,
    frontendUrl: process.env.FRONTEND_URL,
    authTokensEarlyExpirySeconds: parseNumber(
      process.env.AUTH_TOKENS_EARLY_EXPIRY_SECONDS,
      0,
    ),
  };
});
