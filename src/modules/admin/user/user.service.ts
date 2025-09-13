import { BadRequestException, Injectable } from '@nestjs/common';

import { comparePassword, hashPassword } from '@/lib/password/password.util';
import { UpdatePasswordUserDto, UpdateUserDto } from '@/modules/admin/user/dto/user.dto';
import { PrismaService } from '@/modules/common/prisma/prisma.service';
import { CurrentUserInterface } from '@/types/user.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

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

  async updateUserPassword(
    user: CurrentUserInterface,
    updatePasswordUserDto: UpdatePasswordUserDto,
  ) {
    const isPasswordValid = await comparePassword(updatePasswordUserDto.password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isPasswordSameAsOld = await comparePassword(
      updatePasswordUserDto.newPassword,
      user.password,
    );

    if (isPasswordSameAsOld) {
      throw new BadRequestException('New password cannot be the same as the old password');
    }

    const hashedPassword = await hashPassword(updatePasswordUserDto.newPassword, 10);

    updatePasswordUserDto.password = hashedPassword;

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
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

    return { updatedUser, message: 'Password updated successfully' };
  }
}
