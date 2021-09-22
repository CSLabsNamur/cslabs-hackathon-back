import { IsBoolean } from 'class-validator';

export class SetCautionDto {
  @IsBoolean()
  cautionStatus: boolean;
}
