import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(35)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  idea: string;
}
