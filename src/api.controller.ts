import { Controller, Get } from '@nestjs/common';

import { ApiService } from '@/api.service';
import { Public } from '@/lib/decorators/public.decorator';

@Controller('')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Public()
  @Get('health')
  getHello() {
    return this.apiService.getHelloService();
  }
}
