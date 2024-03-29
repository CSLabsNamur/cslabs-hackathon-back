import { AuthenticationService } from '../services/authentication.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { RequestWithUser } from '../request-with-user.interface';
import { LocalAuthenticationGuard } from '../guards/local-authentication.guard';
import { JwtAuthenticationGuard } from '../guards/jwt-authentication.guard';
import { UsersService } from '../../users/services/users.service';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { AskPasswordResetDto } from '../dto/ask-password-reset.dto';
import { PasswordResetDto } from '../dto/password-reset.dto';
import { User } from '../../users/entities/user.entity';

/** NestJS Controller handling requests about authentication */
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @return {User} The logged-in user
   * @throws 401 if the refresh token is invalid or expired
   */
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  async refresh(@Req() request: RequestWithUser) {
    const { user } = request;
    const accessToken = this.authenticationService.getAccessToken(user.id);
    user.password = undefined;
    user.currentHashedRefreshToken = undefined;
    return { ...user, accessToken };
  }

  /** Register a new user
   * @param {RegisterDto} registrationData - The needed data for registering the user
   * @throws 403 if the registration data is invalid
   */
  @Post('register')
  async register(@Body() registrationData: RegisterDto): Promise<User> {
    return this.authenticationService.register(registrationData);
  }

  /** Log-in an user with its credentials
   * Credentials are "email" and "password" and must appear in a JSON body.
   * @see LocalAuthenticationGuard
   * @return {User} user - The user corresponding to the credentials
   * @throws 401 if credentials are wrong
   */
  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;
    const accessToken = this.authenticationService.getAccessToken(user.id);
    const refreshToken = this.authenticationService.getRefreshToken(user.id);

    await this.usersService.setCurrentRefreshToken(user.id, refreshToken);

    user.password = undefined;
    user.currentHashedRefreshToken = undefined;
    return { ...user, accessToken, refreshToken };
  }

  /** Log-out the user
   * @throws 401 if the user is not logged-in
   */
  @HttpCode(200)
  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  async logOut(@Req() request: RequestWithUser) {
    await this.usersService.removeRefreshToken(request.user.id);
  }

  /** Send an email with a password reset link
   * It sends the email only if there is an associated user in the database
   * @param {AskPasswordResetDto} askPasswordResetData - The DTO containing the email of the receiver
   * @throws 403 if the email is malformed
   */
  @Post('ask-password-reset')
  async askPasswordReset(@Body() askPasswordResetData: AskPasswordResetDto) {
    await this.authenticationService.sendPasswordResetMail(
      askPasswordResetData.email,
    );
  }

  /** Change the password of an user
   * @param passwordResetData - The DTO containing the password reset validation token and the new password
   *  The needed data about the user is in the token
   * @throws 403 if the token is invalid/expired or if the password is malformed
   */
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() passwordResetData: PasswordResetDto) {
    await this.authenticationService.resetPassword(
      passwordResetData.resetPasswordToken,
      passwordResetData.newPassword,
    );
  }
}
