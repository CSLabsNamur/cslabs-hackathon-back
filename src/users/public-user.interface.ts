import { PublicTeamInterface } from '../teams/public-team.interface';

export interface PublicUserInterface {
  id: string;
  firstName: string;
  lastName: string;
  github: string;
  linkedIn: string;
  team?: PublicTeamInterface;
}
