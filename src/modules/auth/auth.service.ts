import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { ErrorMessages } from '@/common/error-messages';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SignupDto } from '@/modules/auth/dto/signup.dto';
import { PrismaService } from '@/modules/prisma/prisma.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  };
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponse> {
    const { email, password } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(ErrorMessages.EMAIL_IN_USE);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    const access_token = await this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      access_token,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...userWithoutPassword } = user;
    const access_token = await this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      access_token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  private async generateToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload);
  }
}
