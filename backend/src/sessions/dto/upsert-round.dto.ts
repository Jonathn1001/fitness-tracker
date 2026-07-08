import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpsertRoundDto {
  @IsUUID() roundTypeId: string;
  @IsInt() @Min(1) roundNumber: number;
  @IsBoolean() completed: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(5) qualityRating?: number;
  @IsOptional() @IsString() notes?: string;
  @IsUUID() idempotencyKey: string;
}
