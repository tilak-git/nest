import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { logger } from '@/lib/logger/logger';
import { LoginDto, SignupDto } from '@/modules/admin/auth/dto/auth.dto';
import { PrismaService } from '@/modules/common/prisma/prisma.service';

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
      throw new ConflictException(`Email ${email} is already in use`);
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
        throw new ConflictException(`Email ${email} is already in use`);
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
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new NotFoundException('Invalid email or password');
      }
    }

    const { password: _, ...userWithoutPassword } = user;
    const access_token = await this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      access_token,
      message: 'Login successful',
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
