import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { ErrorMessages } from '@/common/error-messages';
import { logger } from '@/lib/logger/logger';
import { LoginDto, SignupDto } from '@/modules/auth/dto/auth.dto';
import { PrismaService } from '@/modules/prisma/prisma.service';

export interface JwtPayload {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(ErrorMessages.EMAIL_IN_USE + `: ${email}`);
    }

    try {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(ErrorMessages.EMAIL_IN_USE);
      }

      logger.error({ err: error }, `Signup failed for email=${email}`);
      throw new InternalServerErrorException('Unexpected error during signup');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(ErrorMessages.USER_NOT_FOUND);
    }

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);
      }
    }

    const { password: _, ...userWithoutPassword } = user;
    const access_token = await this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      access_token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    return user;
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async generateToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = { id: userId, email };
    return this.jwtService.signAsync(payload);
  }
}
