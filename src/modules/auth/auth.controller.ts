import { Body, Controller, Get, Post } from '@nestjs/common';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { Public } from '@/lib/decorators/public.decorator';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SignupDto } from '@/modules/auth/dto/signup.dto';
import { CurrentUserInterface } from '@/types/user.interface';

@Controller('auth')
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
    return user;
  }

  @Get('protected')
  async getProtectedResource(@CurrentUser() user: CurrentUserInterface) {
    return {
      message: 'This is a protected route',
      user,
    };
  }
}
