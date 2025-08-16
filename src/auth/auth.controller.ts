import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthService, AuthResponse } from '@/auth/auth.service';
import { LoginDto } from '@/auth/dto/login.dto';
import { SignupDto } from '@/auth/dto/signup.dto';
import { AuthJwtGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { Public } from '@/lib/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
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
