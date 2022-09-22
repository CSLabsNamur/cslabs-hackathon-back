import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from '../dto/update-user.dto';
import { TeamsService } from '../../teams/services/teams.service';
import { PublicUserInterface } from '../public-user.interface';
import { Team } from '../../teams/entities/team.entity';
import * as fs from 'fs/promises';
import {SendAnnounceDto} from "../dto/send-announce.dto";
import {EmailService} from "../../email/services/email.service";

/** Class handling the business logic about users
 * @see User
 */
@Injectable()
export class UsersService {

  private logger = new Logger(UsersService.name);

  /** Configure the instance and reference other services */
  constructor(
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /** Return an user by its email address
   * @param email - The email address of the user
   * @throws {HttpException} if the user does not exist
   */
  async getByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: {email},
      relations: ['team', 'team.members'],
    });
    // const user = await this.usersRepository.findOne(
    //   { email },
    //   { relations: ['team', 'team.members'] },
    // ); // CHECK AND REMOVE
    if (!user) {
      throw new HttpException(
        'User with this email does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }

    const members = user.team?.members;
    if (members) {
      user.team.members = await Promise.all(members.map(
        async (member) => await this.filterPrivateInformation(member) as User
      ))
    }

    return user;
  }

  /** Return an user by its ID
   * @param id - The ID of the user
   * @param memberAllInfo - Return private information if True, otherwise return public information
   * @throws {HttpException} if the user does not exist
   */
  async getById(id: string, memberAllInfo = false): Promise<User> {
    // const user = await this.usersRepository.findOne(
    //   { id },
    //   { relations: ['team', 'team.members'] },
    // ); TODO : CHECK AND REMOVE
    const user = await this.usersRepository.findOne({
      where: {id},
      relations: ['team', 'team.members'],
    });
    if (!user) {
      throw new HttpException(
        'User with this identifier does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }

    const members = user.team?.members;
    if (members && !memberAllInfo) {
      user.team.members = await Promise.all(members.map(
        async (member) => await this.filterPrivateInformation(member) as User
      ))
    }

    return user;
  }

  async filterPrivateInformation(user: User): Promise<PublicUserInterface> {
    const { id, firstName, lastName, github, linkedIn, paidCaution } = user;
    const publicUser = { id, firstName, lastName, github, linkedIn, paidCaution };

    if (user.team) {
      return {
        ...publicUser,
        team: await this.teamsService.filterPrivateInformation(user.team),
      };
    }

    return publicUser;
  }

  async getAll(): Promise<User[]> {
    return await this.usersRepository.find({relations: ['team']});
  }

  /** Return an user by its ID if the refresh token is valid
   * @param userId - The ID of the user
   * @param refreshToken - The associated refresh token
   * @return {user | null} The user if the refresh token is valid, otherwise null
   * @throws {HttpException} if the user ID is invalid
   */
  async getUserIfRefreshTokenMatches(
    userId: string,
    refreshToken: string,
  ): Promise<User | null> {
    const user = await this.getById(userId);

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    return isRefreshTokenMatching ? user : null;
  }

  /** Set a new refresh token for a specific user
   * @param userId - The ID of the user
   * @param refreshToken - The new refresh token
   */
  async setCurrentRefreshToken(userId: string, refreshToken: string) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, { currentHashedRefreshToken });
  }

  /** Remove the refresh token of a specific user
   * @param userId - The ID of the user
   */
  async removeRefreshToken(userId: string) {
    await this.usersRepository.update(userId, {
      currentHashedRefreshToken: null,
    });
  }

  async setTeam(user: User, team: Team) {
    if (team.members.length > 4) {
      throw new HttpException('team is full.', HttpStatus.BAD_REQUEST);
    }
    await this.usersRepository.update(user.id, { team });
    return await this.teamsService.getById(team.id);
  }

  async removeTeam(user: User) {
    await this.usersRepository.update(user.id, {
      team: null,
      isTeamOwner: false,
    });
  }

  async setVote(userId: string, team: Team) {
    await this.usersRepository.update(userId, { vote: team });
  }

  async setCautionStatus(userId: string, cautionStatus: boolean) {
    const user = await this.getById(userId, true);
    await this.usersRepository.update(user.id, { paidCaution: cautionStatus });
    if (user.team) {
      await this.teamsService.updateValidity(user.team.id);
    }
  }

  async update(userId: string, userData: UpdateUserDto) {
    const { firstName, lastName, github, linkedIn, comment } = userData;
    await this.usersRepository.update(userId, {
      firstName,
      lastName,
      github,
      linkedIn,
      comment,
    });
    return await this.getById(userId);
  }

  async uploadCv(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new HttpException('Missing CV file.', HttpStatus.BAD_REQUEST);
    }
    const user = await this.getById(userId);
    if (user.cv) {
      try {
        await fs.rm(user.cv);
        this.logger.log(`Removed old CV: [${user.cv}].`);
      } catch (err) {
        this.logger.error(`Failed to remove old cv: [${user.cv}].`);
      }
    }

    await this.usersRepository.update(userId, { cv: file.path });
    this.logger.log(`Uploaded CV: [${file.path}].`);
  }

  async sendAnnounceToAll(data: SendAnnounceDto) {
    const users = await this.getAll();
    const emails = users.map((user) => user.email);
    await this.emailService.sendAdminAnnounce(data.subject, data.announce, emails);
  }

  async delete(userId: string) {
    const user = await this.getById(userId);
    await this.usersRepository.delete(userId);
    return user;
  }

  /**
   * Create a new user from its data
   * @see CreateUserDto
   * @param userData - The data of the user
   * @return {User} The new user
   * @throws {Error} if the data is invalid
   */
  async create(userData: CreateUserDto): Promise<User> {
    const {
      email, firstName, lastName, github, linkedIn, comment, password, imageAgreement,
    } = userData;
    const newUser = await this.usersRepository.create({
      email,
      firstName,
      lastName,
      github,
      linkedIn,
      comment,
      password,
      imageAgreement,
    });
    await this.usersRepository.save(newUser);
    return newUser;
  }

  /** Replace an user's password by another one
   * @param userId - The ID of the user
   * @param newHashedPassword - The hashed new password
   */
  async changeUserPassword(userId: string, newHashedPassword: string) {
    await this.usersRepository.update(userId, {
      password: newHashedPassword,
    });
  }

  /**
   * Check all constraints related to user registration process.
   * For example, the number of users is limited.
   * @throws {HttpException} if a constraint is not respected.
   */
  async checkRegistrationConstraints() {
    const users = await this.usersRepository.find({ where: {isAdmin: false} });

    const MAX_USERS = 65;
    if (users.length >= MAX_USERS) {
      throw new HttpException('Max number of users reached.', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Get the number of votes for a specific team.
   * @param team_id - The ID of the team. It must be a valid team ID.
   * @return {number} The number of votes for this team.
   */
  async getVotesFor(team_id: string): Promise<number> {
    return await this.usersRepository.count({where: {voteId: team_id}});
  }
}
