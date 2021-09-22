import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
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

/** Class handling the business logic about users
 * @see User
 */
@Injectable()
export class UsersService {
  /** Configure the instance and reference other services */
  constructor(
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
    const user = await this.usersRepository.findOne(
      { email },
      { relations: ['team'] },
    );
    if (!user) {
      throw new HttpException(
        'User with this email does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }

  /** Return an user by its ID
   * @param id - The ID of the user
   * @throws {HttpException} if the user does not exist
   */
  async getById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne(
      { id },
      { relations: ['team'] },
    );
    if (!user) {
      throw new HttpException(
        'User with this identifier does not exist.',
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  async filterPrivateInformation(user: User): Promise<PublicUserInterface> {
    const { id, firstName, lastName, github, linkedIn } = user;
    const publicUser = { id, firstName, lastName, github, linkedIn };

    if (user.team) {
      return {
        ...publicUser,
        team: await this.teamsService.filterPrivateInformation(user.team),
      };
    }

    return publicUser;
  }

  async getAll(): Promise<User[]> {
    return await this.usersRepository.find();
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
    return team;
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
    const user = await this.getById(userId);
    await this.usersRepository.update(user.id, { paidCaution: cautionStatus });
    if (user.team) {
      await this.teamsService.updateValidity(user.team);
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
    const { email, firstName, lastName, github, linkedIn, comment, password } =
      userData;
    const newUser = await this.usersRepository.create({
      email,
      firstName,
      lastName,
      github,
      linkedIn,
      comment,
      password,
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
}
