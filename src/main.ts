import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('HavenBootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // CORS configuration (commented out for development)
  // const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // app.enableCors({
  //   origin: [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.7:3000'],
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  // });

  // Allow all CORS in development (origin: true reflects the request origin and supports credentials)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global API route prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Haven API')
    .setDescription('Full-Stack Visitor & Access Management Platform API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Authentication', 'Unified authentication, token refresh and profile')
    .addTag('Organizations', 'Tenant organization management (Super Admin)')
    .addTag('Users', 'User accounts and role assignment')
    .addTag('Employees', 'Employee hosts and department personnel')
    .addTag('Departments', 'Organizational departments')
    .addTag('Buildings', 'Building facilities and locations')
    .addTag('Visitors', 'Reusable visitor profile management')
    .addTag('Visits', 'Appointments and walk-in visit schedules')
    .addTag('Approvals', 'Host approval workflows and QR pass issuance')
    .addTag('Check-in / Check-out', 'QR scanner verification and attendance tracking')
    .addTag('Reports & Analytics', 'KPI summaries, visitor trends, and log exports')
    .addTag('Notifications', 'In-app and email alert dispatching')
    .addTag('Audit Logs', 'Immutable system activity trail')
    .addTag('Settings', 'Organization policy and visit duration configuration')
    .addTag('Storage', 'Encrypted file and visitor photograph storage')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Haven API Documentation',
  });

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);
  logger.log(`Haven backend running at: http://localhost:${port}/api/v1`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();

