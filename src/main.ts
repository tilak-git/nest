import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from '@/app.module';
import { ENV_CONSTS } from '@/common/constant';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(ENV_CONSTS.SERVER_PORT, () => {
    console.log(`Server is running on: http://localhost:3001`);
  });
}

bootstrap();
