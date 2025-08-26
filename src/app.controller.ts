import { join } from 'path';

import { Controller, Get, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';

import { AppService } from '@/app.service';
import { Public } from '@/lib/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('*')
  serveApp(@Res() reply: FastifyReply) {
    // @ts-ignore because sendFile is added by fastify-static
    return reply.sendFile('index.html', join(process.cwd(), 'public', 'build'));
  }
}
