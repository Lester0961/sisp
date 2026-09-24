import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  // Required environment variables are validated by ConfigModule (P1-06)
  // as soon as AppModule initializes, before any request handling.
  // Uploads are sent as base64 JSON. A 10 MB file expands to about 13.4 MB,
  // so parser limits must exceed the encoded payload while service-level
  // validators continue to enforce the actual 10 MB file limit.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '16mb' }));
  app.use(urlencoded({ extended: true, limit: '16mb' }));

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // Enable CORS — strict origin allow-list, validate Origin header
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.ADDITIONAL_CORS_ORIGINS || '').split(','),
  ]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && configuredOrigins.length === 0) {
    throw new Error(
      'FRONTEND_URL (or ADDITIONAL_CORS_ORIGINS) must be configured in production CORS.',
    );
  }

  // Production trusts only explicitly configured origins; development keeps
  // local helpers. No deployment aliases are hardcoded here.
  const allowedOrigins = isProd
    ? configuredOrigins
    : [
        ...configuredOrigins,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3014',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin / no-origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-ML-Secret'],
  });

  // Global validation pipe — enforces class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie parser middleware
  app.use(cookieParser());

  // Behind the Render/HTTPS proxy, trust the first proxy hop so secure
  // cookies and client IPs are interpreted correctly.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 SISP Backend running on http://localhost:${port}/api`);
}

bootstrap();
