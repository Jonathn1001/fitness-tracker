import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSetDto {
  @IsOptional() @IsInt() @Min(0) reps?: number;
  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsBoolean() completed?: boolean;
}
