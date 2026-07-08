import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateRoundDto {
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(5) qualityRating?: number;
  @IsOptional() @IsString() notes?: string;
}
