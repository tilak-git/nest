import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { UpdatePasswordUserDto, UpdateUserDto } from '@/modules/user/dto/updateUser.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async updateUserPassword(id: string, updatePasswordUserDto: UpdatePasswordUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isPasswordValid = await bcrypt.compare(updatePasswordUserDto.password, user.password);

    if (!isPasswordValid) {
      throw new NotFoundException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(updatePasswordUserDto.newPassword, 10);

    updatePasswordUserDto.password = hashedPassword;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(id: string) {
    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    return deletedUser?.id;
  }
}
