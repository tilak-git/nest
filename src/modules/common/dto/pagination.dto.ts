import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class PaginationDto {
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNotEmpty()
  @IsInt()
  page: number = 1;

  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNotEmpty()
  @IsInt()
  limit: number = 10;
}
