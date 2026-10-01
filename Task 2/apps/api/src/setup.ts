import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync } from 'fs';
import { config } from './common/config';
import { UPLOAD_DIR } from './admin/admin.controller';

/** Shared between main.ts and the e2e tests so tests exercise the real pipeline. */
export function configureApp(app: INestApplication) {
  const exp = app as NestExpressApplication;
  exp.set('trust proxy', 1); // behind Render/Railway proxies: correct client IPs for rate limiting
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: [config.webUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  if (existsSync(UPLOAD_DIR)) exp.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads' });
}
