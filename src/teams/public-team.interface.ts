import { PublicUserInterface } from '../users/public-user.interface';

export interface PublicTeamInterface {
  id: string;

  name: string;

  description: string;

  idea: string;

  members?: PublicUserInterface[];
}
