import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  @Min(1)
  amount: number; // Amount in rupees

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCheckoutSessionDto {
  @IsEmail()
  email: string;

  @IsString()
  priceId: string;
}
