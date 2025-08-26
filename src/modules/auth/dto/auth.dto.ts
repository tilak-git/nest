import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

import { Match } from '@/lib/decorators/match.decorator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @MinLength(6)
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
