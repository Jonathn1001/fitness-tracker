import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSessionDto {
  @IsOptional() @IsUUID() templateDayId?: string;
  @IsDateString() date: string;
  @IsOptional() @IsEnum(['walk', 'run']) warmupType?: 'walk' | 'run';
  @IsOptional() @IsInt() @Min(1) warmupDurationMin?: number;
  @IsOptional() @IsString() notes?: string;
  @IsUUID() idempotencyKey: string;
}
