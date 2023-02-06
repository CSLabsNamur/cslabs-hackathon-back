import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable, Logger,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { CreateTeamDto } from '../dto/create-team.dto';

import { v4 as uuid_v4 } from 'uuid';
import { DataSource, Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { PublicTeamInterface } from '../public-team.interface';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { EmailService } from '../../email/services/email.service';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly connection: DataSource,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  private logger = new Logger(TeamsService.name);

  async getAll(user: User): Promise<Team[] | PublicTeamInterface[]> {
    let teams = await this.teamsRepository.find({ relations: ['members'] });

    if (!user.isAdmin) {
      return await Promise.all(
        teams
          .filter((team) => team.valid)
          .map(async (team) => this.filterPrivateInformation(team))
      );
    }

    return teams;
  }

  async getById(teamId: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
      relations: ['members'],
    });
    if (!team) {
      throw new HttpException(
        'Team with this identifier does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }
    return team;
  }

  async getByToken(teamToken: string) {
    const team = await this.teamsRepository.findOne({
      where: { token: teamToken },
      relations: ['members'],
    });
    if (!team) {
      throw new HttpException('wrong token.', HttpStatus.BAD_REQUEST);
    }
    return team;
  }

  async filterPrivateInformation(team: Team): Promise<PublicTeamInterface> {
    const { id, name, description, idea } = team;
    const publicTeam = { id, name, description, idea };

    if (team.members) {
      return {
        ...publicTeam,
        members: await Promise.all(
          team.members.map((member) =>
            this.usersService.filterPrivateInformation(member),
          ),
        ),
      };
    }

    return publicTeam;
  }

  async invite(user: User, newMemberEmail: string) {
    const team = user.team;
    if (!team) {
      throw new HttpException('user has not any team.', HttpStatus.BAD_REQUEST);
    }
    try {
      await this.emailService.sendTeamInvitation(team, newMemberEmail);
    } catch (err) {
      throw new HttpException(
        'Could not send invitation.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async vote(user: User, teamId: string) {
    const team = await this.getById(teamId);
    if (user.team && user.team.id === teamId) {
      throw new HttpException(
        'user cannot vote for its own team.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!team.valid) {
      throw new HttpException(
        'user cannot vote for an invalid team..',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.usersService.setVote(user.id, team);
  }

  async getVoteResults() {
    const teams = await this.teamsRepository.find({where: {valid: true}});
    return await Promise.all(teams.map(async (team) => ({
      id: team.id,
      name: team.name,
      votes: await this.usersService.getVotesFor(team.id)
    })));
  }

  async join(user: User, teamToken: string) {
    if (user.team) {
      throw new HttpException(
        'user has already a team.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const team = await this.getByToken(teamToken);
    await this.updateValidity(team.id);
    return await this.usersService.setTeam(user, team);
  }

  async leave(userId: string): Promise<Team> {
    const user = await this.usersService.getById(userId);
    const team = user.team;
    if (!team) {
      throw new HttpException('user has not any team.', HttpStatus.BAD_REQUEST);
    }

    if (user.isTeamOwner && team.members.length > 1) {
      throw new HttpException(
        'you cannot leave users in a team without owner.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.removeTeam(user);
    await this.updateValidity(team.id);
    if (team.members.length < 2) {
      return await this.delete(user, team.id);
    }
    return team;
  }

  async forceLeave(userId: string, memberId: string): Promise<Team> {
    if (userId === memberId) {
      return await this.leave(userId);
    }

    const user = await this.usersService.getById(userId);
    if (user.isAdmin) {
      return await this.leave(memberId);
    }

    const member = await this.usersService.getById(memberId);
    if (!user.isTeamOwner || user.team.id !== member.team.id) {
      throw new HttpException('user has no authority to kick this team member.', HttpStatus.FORBIDDEN);
    }

    return await this.leave(memberId);
  }

  async updateValidity(teamId: string) {
    const team = await this.getById(teamId);
    const valid = team.members.filter((member) => member.paidCaution).length > 0;
    await this.teamsRepository.update(team.id, { valid });
  }

  async create(userID: string, teamData: CreateTeamDto): Promise<Team> {
    const { name, description, idea, invitations } = teamData;
    let user = await this.usersService.getById(userID);
    if (await this.teamsRepository.findOneBy({name})) {
      throw new HttpException("A team with this name already exists.", HttpStatus.BAD_REQUEST);
    }
    const team = await this.teamsRepository.create({
      name,
      description,
      idea,
      token: uuid_v4(),
      valid: user.paidCaution,
    });

    if (!team) {
      throw new HttpException(
        'Invalid team information.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(team);
      await queryRunner.manager.update(User, userID, {
        team,
        isTeamOwner: true,
      });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new HttpException(
        'Team creation failed.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }

    await this.teamsRepository.save(team);
    user = await this.usersService.getById(userID);
    await Promise.all(invitations.map(async (email) => {
      try {
        await this.invite(user, email);
      } catch (error) {
        this.logger.error(`Failed to invite [${email}].`);
      }
    }));

    return team;
  }

  async update(
    user: User,
    teamId: string,
    teamData: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.getById(teamId);

    if (!user.isAdmin && (!user.isTeamOwner || user.team.id !== team.id)) {
      throw new HttpException(
        'user is not the team owner.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.teamsRepository.update(teamId, {
      name: teamData.name,
      description: teamData.description,
      idea: teamData.idea,
    });

    return team;
  }

  async delete(user: User, teamId: string): Promise<Team> {
    const team = await this.getById(teamId);

    if (!user.isAdmin && (!user.isTeamOwner || user.team.id !== team.id)) {
      throw new HttpException(
        'user is not the team owner.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await Promise.all(
        team.members.map(async (member) => {
          await queryRunner.manager.update(User, member.id, {
            isTeamOwner: false,
          });
        }),
      );
      await queryRunner.manager.delete(Team, team.id);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw new HttpException(
        'Team deletion failed.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }

    return team;
  }
}
