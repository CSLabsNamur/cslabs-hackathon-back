import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  /** The first name of the new user */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(35)
  @Matches(/^[ \u00C0-\u01FFa-zA-Z'\-]+$/u, {
    message: 'first name must contains letters and spaces only',
  })
  firstName: string;

  /** The last name of the new user */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(35)
  @Matches(/^[ \u00C0-\u01FFa-zA-Z'\-]+$/u, {
    message: 'last name must contains letters and spaces only',
  })
  lastName: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MinLength(3)
  @MaxLength(1024)
  github?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MinLength(3)
  @MaxLength(1024)
  linkedIn?: string;

  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(2048)
  comment?: string;
}
