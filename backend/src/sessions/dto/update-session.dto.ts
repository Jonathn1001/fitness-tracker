import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSessionDto {
  @IsOptional() @IsEnum(['walk', 'run']) warmupType?: 'walk' | 'run';
  @IsOptional() @IsInt() @Min(1) warmupDurationMin?: number;
  @IsOptional() @IsString() notes?: string;
}
