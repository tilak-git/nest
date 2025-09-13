import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { comparePassword, hashPassword } from '@/lib/password/password.util';
import { LoginDto, SignupDto } from '@/modules/admin/auth/dto/auth.dto';
import { JwtPayload } from '@/modules/admin/auth/strategies/jwt.strategy';
import { PrismaService } from '@/modules/common/prisma/prisma.service';
import { CurrentUserInterface } from '@/types/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`Email ${email} is already in use`);
    }

    const hashedPassword = await hashPassword(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    const access_token = await this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      access_token,
      message: 'Signup successful',
    };
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
      const isPasswordValid = await comparePassword(password, user.password);

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

  async getProfile(user: CurrentUserInterface) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
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
