import { IsNotEmpty, MinLength } from 'class-validator';

import { Match } from '@/lib/decorators/match.decorator';

export class UpdateUserDto {
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}

export class UpdatePasswordUserDto {
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @IsNotEmpty()
  @MinLength(6)
  @Match('newPassword', { message: 'New Password and Confirm do not match' })
  confirmPassword: string;
}
