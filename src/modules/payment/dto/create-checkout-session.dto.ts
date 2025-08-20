import { IsEmail, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsEmail()
  email: string;

  @IsString()
  priceId: string;
}
