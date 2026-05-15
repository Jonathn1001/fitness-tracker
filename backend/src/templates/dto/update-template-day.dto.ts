import { IsArray, IsOptional, ValidateNested, IsUUID, IsInt, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExerciseDto {
  @IsUUID() exerciseId: string;
  @IsInt() @Min(1) defaultSets: number;
  @IsInt() @Min(1) defaultReps: number;
  @IsNumber() @Min(0) defaultWeightKg: number;
  @IsInt() @Min(1) order: number;
}

export class UpdateRoundDto {
  @IsUUID() roundTypeId: string;
  @IsInt() @Min(1) roundNumber: number;
}

export class UpdateTemplateDayDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateExerciseDto)
  exercises?: UpdateExerciseDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateRoundDto)
  rounds?: UpdateRoundDto[];
}
