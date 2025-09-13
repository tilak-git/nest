import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { logger } from '@/lib/logger/logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
