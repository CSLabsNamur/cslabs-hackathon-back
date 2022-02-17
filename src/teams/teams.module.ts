import { forwardRef, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamsController } from './controllers/teams.controller';
import { AuthenticationModule } from '../authentication/authentication.module';
import { TeamsService } from './services/teams.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team]),
    AuthenticationModule,
    EmailModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
