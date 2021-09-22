import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from '../services/teams.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { JwtAuthenticationGuard } from '../../authentication/guards/jwt-authentication.guard';
import { RequestWithUser } from '../../authentication/request-with-user.interface';
import { Team } from '../entities/team.entity';
import { AdminGuard } from '../../authentication/guards/admin.guard';
import { PublicTeamInterface } from '../public-team.interface';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { InviteTeamDto } from '../dto/invite-team.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthenticationGuard)
  @Get()
  async getAll(): Promise<Team[]> {
    return await this.teamsService.getAll();
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('me')
  async getOwnTeam(@Req() request: RequestWithUser): Promise<Team> {
    const team = request.user.team;
    if (!team) {
      throw new HttpException('user has not any team.', HttpStatus.NOT_FOUND);
    }
    return team;
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':teamId')
  async getOtherTeam(
    @Req() request: RequestWithUser,
    @Param('teamId') teamId: string,
  ): Promise<PublicTeamInterface> {
    const team = await this.teamsService.getById(teamId);
    return await this.teamsService.filterPrivateInformation(team);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('invite')
  async inviteMember(
    @Req() request: RequestWithUser,
    @Body() invitationData: InviteTeamDto,
  ) {
    await this.teamsService.invite(request.user, invitationData.email);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('vote/:teamId')
  async vote(@Req() request: RequestWithUser, @Param('teamId') teamId: string) {
    await this.teamsService.vote(request.user, teamId);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('join/:teamToken')
  async join(
    @Req() request: RequestWithUser,
    @Param('teamToken') teamToken: string,
  ): Promise<Team> {
    return await this.teamsService.join(request.user, teamToken);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('leave')
  async leave(@Req() request: RequestWithUser) {
    return await this.teamsService.leave(request.user.id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('new')
  async create(
    @Req() request: RequestWithUser,
    @Body() teamData: CreateTeamDto,
  ): Promise<Team> {
    return await this.teamsService.create(request.user.id, teamData);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Put(':teamId')
  async update(
    @Req() request: RequestWithUser,
    @Param('teamId') teamId: string,
    @Body() teamData: UpdateTeamDto,
  ) {
    return await this.teamsService.update(request.user, teamId, teamData);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Delete(':teamId')
  async delete(
    @Req() request: RequestWithUser,
    @Param('teamId') teamId: string,
  ): Promise<Team> {
    return await this.teamsService.delete(request.user, teamId);
  }
}
