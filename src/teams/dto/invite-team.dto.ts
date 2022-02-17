import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class InviteTeamDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
