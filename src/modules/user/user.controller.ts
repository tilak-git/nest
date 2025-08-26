import { Body, Controller, Delete, Get, Param, Patch, Put } from '@nestjs/common';

import { CurrentUser } from '@/lib/decorators/currentUser.decoraror';
import { UpdatePasswordUserDto, UpdateUserDto } from '@/modules/user/dto/user.dto';
import { UserService } from '@/modules/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async signup(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Put()
  async updateUser(@CurrentUser('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Patch('password')
  async updateUserPassword(
    @CurrentUser('id') id: string,
    @Body() updatePasswordUserDto: UpdatePasswordUserDto,
  ) {
    return this.userService.updateUserPassword(id, updatePasswordUserDto);
  }

  @Delete()
  async deleteUser(@CurrentUser('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
