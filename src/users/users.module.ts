import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { AuthenticationModule } from '../authentication/authentication.module';
import { TeamsModule } from '../teams/teams.module';

/** NestJs Module handling the users of the server */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthenticationModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
