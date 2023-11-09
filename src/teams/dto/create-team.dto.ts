import {
  ArrayMaxSize,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(35)
  name: string;

  @IsString()
  @MaxLength(1024)
  description: string;

  @IsString()
  @MaxLength(1024)
  idea: string;

  @IsString({ each: true })
  @ArrayMaxSize(3)
  invitations: string[];
}
