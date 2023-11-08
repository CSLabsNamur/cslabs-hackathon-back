import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { AuthenticationModule } from '../authentication/authentication.module';
import { TeamsModule } from '../teams/teams.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { pdfFileNameFactory } from '../utils/multer/pdf-file-name.factory';
import { EmailModule } from '../email/email.module';

/** NestJs Module handling the users of the server */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MulterModule.register({
      limits: {
        fileSize: 5*1024*1024,
      },
      storage: diskStorage({
        destination: './upload',
        filename: pdfFileNameFactory,
      })
    }),
    forwardRef(() => AuthenticationModule),
    forwardRef(() => TeamsModule),
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
