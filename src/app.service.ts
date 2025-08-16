import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  getHelloService(): string {
    return 'Hello World!';
  }
}
