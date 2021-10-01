import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { JwtAuthenticationGuard } from '../../authentication/guards/jwt-authentication.guard';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { AdminGuard } from '../../authentication/guards/admin.guard';
import { RequestWithUser } from '../../authentication/request-with-user.interface';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SetCautionDto } from '../dto/set-caution.dto';
import {FileInterceptor} from "@nestjs/platform-express";
import {pdfFileFilter} from "../../utils/multer/pdf-file.filter";

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthenticationGuard)
  @Get()
  async getAll(): Promise<User[]> {
    return this.usersService.getAll();
  }

  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthenticationGuard)
  @Post('caution/:userId')
  async setCautionStatus(
    @Param('userId') userId: string,
    @Body() cautionData: SetCautionDto,
  ) {
    await this.usersService.setCautionStatus(userId, cautionData.cautionStatus);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('/me')
  async getProfile(@Req() request: RequestWithUser) {
    return request.user;
  }

  @UseGuards(JwtAuthenticationGuard)
  @Put('/me')
  async updateProfile(
    @Req() request: RequestWithUser,
    @Body() userData: UpdateUserDto,
  ) {
    return await this.usersService.update(request.user.id, userData);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('upload-cv')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: pdfFileFilter,
  }))
  async uploadCv(@Req() request: RequestWithUser, @UploadedFile() file: Express.Multer.File) {
    await this.usersService.uploadCv(request.user.id, file);
  }

  @UseGuards(AdminGuard)
  @UseGuards(JwtAuthenticationGuard)
  @Delete('/:userId')
  async delete(@Param('userId') userId: string) {
    return await this.usersService.delete(userId);
  }
}
