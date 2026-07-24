import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const isProd = process.env.NODE_ENV === 'production';

  const allowedOrigins = isProd
    ? [frontendUrl, 'https://sisp-theta.vercel.app'].filter(
        (o): o is string => Boolean(o) && !o.startsWith('http://localhost'),
      )
    : [
        frontendUrl,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://sisp-theta.vercel.app',
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 SISP Backend running on http://localhost:${port}/api`);
}

bootstrap();
