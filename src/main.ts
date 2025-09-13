import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { ApiModule } from '@/api.module';
import { GlobalExceptionFilter } from '@/lib/interceptor/global-exception-filter';
import { TransformResponseInterceptor } from '@/lib/interceptor/response-interceptor';
import { AppLogger, logger } from '@/lib/logger/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ApiModule,
    new FastifyAdapter({ logger: AppLogger }),
  );

  app.setGlobalPrefix('api');

  // Enable CORS
  await app.register(require('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'prod' ? process.env.FRONTEND_ADMIN_URL : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Security headers
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        scriptSrc: [`'self'`],
        objectSrc: [`'none'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        fontSrc: [`'self'`],
      },
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (validationErrors = []) => {
        const messages = validationErrors.map((err) => Object.values(err.constraints ?? {})).flat();
        const errorMessage = messages.join(', ');
        return new BadRequestException(errorMessage);
      },
    }),
  );

  // Global Response and Error Handler
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Swagger API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  let document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  let docs: any = document;
  if (process.env.NODE_ENV !== 'prod') {
    for (const path in docs.paths) {
      for (const method in docs.paths[path]) {
        const operation = docs.paths[path][method];

        if (operation && typeof operation === 'object') {
          const hasNoSecurity = !operation.security || operation.security.length === 0;

          if (hasNoSecurity) {
            operation.security = [{ 'JWT-auth': [] }];
          }
        }
      }
    }
  }

  SwaggerModule.setup('api-docs', app, docs, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.SERVER_PORT || 5008;
  await app.listen(port, '0.0.0.0');

  logger.info(`Application is running on: http://localhost:${port}`);
  logger.info(`Swagger documentation available at: http://localhost:${port}/api-docs`);
}

bootstrap();
