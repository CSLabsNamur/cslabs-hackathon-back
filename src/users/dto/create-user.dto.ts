// noinspection JSUnusedGlobalSymbols

/** Data Transfer Object handling the data for creating an user */
export class CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  github?: string;
  linkedIn?: string;
  comment?: string;
  password: string;
  imageAgreement: boolean;
}
