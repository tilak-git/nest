import { Controller, Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Get('user')
  async signup() {
    return {
      status: true,
      message: 'user controller',
    };
  }
}
