import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { configs } from './config/consts';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(configs.SERVER_PORT, () => {
    console.log(`Server is running on: http://localhost:3001`);
  });
}

bootstrap();
