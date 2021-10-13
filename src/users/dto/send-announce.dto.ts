import {IsNotEmpty, IsString} from "class-validator";

export class SendAnnounceDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  announce: string;
}
