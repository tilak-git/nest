// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client';

// @Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
//   constructor() {
//     super({
//       // Add any Prisma client options here
//       log: ['query', 'info', 'warn', 'error'],
//     });
//   }

//   async onModuleInit() {
//     // Connect to the database when the module initializes
//     await this.$connect();
//   }

//   async onModuleDestroy() {
//     // Disconnect from the database when the module is destroyed
//     await this.$disconnect();
//   }

//   // Optional: Add custom methods for database operations
//   async cleanDatabase() {
//     // Useful for testing - truncate all tables
//     if (process.env.NODE_ENV === 'production') {
//       throw new Error('Cannot clean database in production');
//     }

//     const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
//       SELECT tablename FROM pg_tables WHERE schemaname='public'
//     `;

//     for (const { tablename } of tablenames) {
//       if (tablename !== '_prisma_migrations') {
//         try {
//           await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
//         } catch (error) {
//           console.log({ error });
//         }
//       }
//     }
//   }

//   // Health check method
//   async isHealthy(): Promise<boolean> {
//     try {
//       await this.$queryRaw`SELECT 1`;
//       return true;
//     } catch {
//       return false;
//     }
//   }
// }

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Try calling super() without any options first
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
