import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';

import { ApiController } from '@/api.controller';
import { ApiService } from '@/api.service';
import { validateEnv } from '@/config/env.config';
import { AdminModule } from '@/modules/admin/admin.module';
import { AppModule } from '@/modules/app/app.module';
import { PrismaModule } from '@/modules/common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [join(process.cwd(), '.env')],
      isGlobal: true,
      cache: true,
      validate: () => validateEnv(),
    }),
    PrismaModule,
    RouterModule.register([
      {
        path: 'admin',
        module: AdminModule,
      },
      {
        path: 'app',
        module: AppModule,
      },
    ]),
    AdminModule,
    AppModule,
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
