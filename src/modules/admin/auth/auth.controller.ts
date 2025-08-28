import { Body, Controller, Get, Post } from '@nestjs/common';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { Public } from '@/lib/decorators/public.decorator';
import { AuthService } from '@/modules/admin/auth/auth.service';
import { LoginDto, SignupDto } from '@/modules/admin/auth/dto/auth.dto';
import { CurrentUserInterface } from '@/types/user.interface';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: CurrentUserInterface) {
    return this.authService.getProfile(user.id);
  }
}
