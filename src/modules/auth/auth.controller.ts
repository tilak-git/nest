import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { Public } from '@/lib/decorators/public.decorator';
import { AuthJwtGuard } from '@/lib/guards/auth-jwt.guard';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SignupDto } from '@/modules/auth/dto/signup.dto';

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
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(AuthJwtGuard)
  @Get('protected')
  async getProtectedResource(@CurrentUser() user: any) {
    return {
      message: 'This is a protected route',
      user,
    };
  }
}
