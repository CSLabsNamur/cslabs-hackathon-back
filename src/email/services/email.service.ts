import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';

/** Class handling business logic about emails */
@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
  ) {}

  async sendRegistrationConfirmationMail(user: {
    firstName: string;
    lastName: string;
    email: string;
  }) {
    const iban = this.configService.get('HACKATHON_IBAN');
    const theme = this.configService.get('HACKATHON_THEME');

    return this.mailService.sendMail({
      to: user.email,
      subject: `[CSLabs] Hackathon "${theme}" - Bienvenue !`,
      template: 'registration-mail',
      context: {
        iban,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }

  async sendTeamInvitation(team: Team, newMemberEmail: string) {
    const iban = this.configService.get('HACKATHON_IBAN');
    const encodedToken = Buffer.from(team.token).toString('base64');
    const theme = this.configService.get('HACKATHON_THEME');

    return this.mailService.sendMail({
      to: newMemberEmail,
      subject: `[CSLabs] Hackathon "${theme}" - Invitation`,
      template: 'team-invitation-mail',
      context: {
        iban,
        teamName: team.name,
        teamToken: encodedToken,
      },
    });
  }

  async sendPasswordReset(user: User, resetToken: string) {
    const theme = this.configService.get('HACKATHON_THEME');

    return this.mailService.sendMail({
      to: user.email,
      subject: `[CSLabs] Hackathon "${theme}" - Réinitialiser le mot de passe`,
      template: 'password-reset-mail',
      context: {
        email: user.email,
        resetToken,
      },
    });
  }

  async sendAdminAnnounce(subject: string, message: string, emails: string[]) {
    const theme = this.configService.get('HACKATHON_THEME');

    for (const email of emails) {
      await this.mailService.sendMail({
        to: email,
        subject: `[CSLabs] Hackathon "${theme}" - ${subject}`,
        template: 'announce-mail',
        context: {
          subject,
          message,
        },
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return true;
  }
}
