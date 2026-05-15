import { IsBoolean, IsInt, IsNumber, IsUUID, Min } from 'class-validator';

export class UpsertSetDto {
  @IsUUID() exerciseId: string;
  @IsInt() @Min(1) setNumber: number;
  @IsInt() @Min(0) reps: number;
  @IsNumber() @Min(0) weightKg: number;
  @IsBoolean() completed: boolean;
  @IsUUID() idempotencyKey: string;
}
