import {IsNotEmpty, IsString, IsIn} from "class-validator";

export class SendAnnounceDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  announce: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['all', 'formation'])
  addressee: string;
}
