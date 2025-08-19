import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from '@/app.module';
import { GlobalExceptionFilter } from '@/lib/interceptor/global-exception-filter';
import { TransformResponseInterceptor } from '@/lib/interceptor/response-interceptor';
import { AppLogger } from '@/lib/logger/logger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: AppLogger }),
  );

  app.setGlobalPrefix('api');

  // Register raw body plugin for webhook verification
  await app.register(require('fastify-raw-body'), {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
    routes: ['/api/payments/webhook'],
  });

  // Enable CORS
  await app.register(require('@fastify/cors'), {
    origin: true, // Allow all origins in development
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
        // Join into one string (or take first message if you prefer)
        const errorMessage = messages.join(', ');

        return new BadRequestException(errorMessage);
      },
    }),
  );

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
  if (process.env.NODE_ENV === 'development') {
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

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
}

bootstrap();
