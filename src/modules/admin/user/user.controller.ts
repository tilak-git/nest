import { Body, Controller, Patch, Put } from '@nestjs/common';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { UpdatePasswordUserDto, UpdateUserDto } from '@/modules/admin/user/dto/user.dto';
import { UserService } from '@/modules/admin/user/user.service';
import { CurrentUserInterface } from '@/types/user.interface';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put()
  async updateUser(@CurrentUser('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('change-password')
  async updateUserPassword(
    @CurrentUser() user: CurrentUserInterface,
    @Body() updatePasswordUserDto: UpdatePasswordUserDto,
  ) {
    return this.userService.updateUserPassword(user, updatePasswordUserDto);
  }
}
