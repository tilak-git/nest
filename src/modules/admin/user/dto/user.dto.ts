import { Transform } from 'class-transformer';
import { IsNotEmpty, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}

export class UpdatePasswordUserDto {
  @IsNotEmpty()
  @MinLength(6)
  @Transform(({ value }) => value.trim())
  password: string;

  @IsNotEmpty()
  @MinLength(6)
  @Transform(({ value }) => value.trim())
  newPassword: string;
}
