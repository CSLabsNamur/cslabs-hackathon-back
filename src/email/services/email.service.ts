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

    return this.mailService.sendMail({
      to: user.email,
      subject: `[CSLabs] Hackathon - Bienvenue !`,
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

    return this.mailService.sendMail({
      to: newMemberEmail,
      subject: `[CSLabs] Hackathon - Invitation`,
      template: 'team-invitation-mail',
      context: {
        iban,
        teamName: team.name,
        teamToken: encodedToken,
      },
    });
  }

  async sendPasswordReset(user: User, resetToken: string) {
    return this.mailService.sendMail({
      to: user.email,
      subject: `[CSLabs] Hackathon - Réinitialiser le mot de passe`,
      template: 'password-reset-mail',
      context: {
        email: user.email,
        resetToken,
      },
    });
  }

  async sendAdminAnnounce(subject: string, message: string, emails: string[]) {
    for (const email of emails) {
      await this.mailService.sendMail({
        to: email,
        subject: `[CSLabs] Hackathon - ${subject}`,
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
