import { Injectable } from '@nestjs/common';
import Mail from 'nodemailer/lib/mailer';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Team } from '../../teams/entities/team.entity';

/** Class handling business logic about emails */
@Injectable()
export class EmailService {
  /**
   * Mail transporter
   * @see Mail
   * @private
   */
  private nodemailerTransport: Mail;

  /** Configure the mail transporter and inject other services */
  constructor(private readonly configService: ConfigService) {
    this.nodemailerTransport = createTransport({
      service: configService.get('EMAIL_SERVICE'),
      auth: {
        user: configService.get('EMAIL_USER'),
        pass: configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  /** Send an email to a specific email address
   * @param options - The options about the receiver and the content of the mail
   * @see Mail.Options
   * @throws {Error} if the mail cannot be transferred
   */
  async sendMail(options: Mail.Options) {
    return this.nodemailerTransport.sendMail(options);
  }

  async sendTeamInvitation(team: Team, newMemberEmail: string) {
    const domain = this.configService.get('FRONTEND_DOMAIN');
    const iban = this.configService.get('HACKATHON_IBAN');
    const encodedToken = Buffer.from(team.token).toString('base64url');
    const messagePlainText = `
        Bienvenue à l’édition 2021 de notre Hackathon !
        Site officiel : ${domain}
        
        Vous recevez ce mail car on vous a envoyé une invitation à rejoindre une équipe :
        -\tNom : ${team.name}
        Vous pouvez rejoindre cette équipe en cliquant sur
        le lien [${domain}/team/invite/${encodedToken}] ou en entrant le code d’invitation
        dans la section « Mon équipe » de notre site.
        
        Code d’invitation : ${encodedToken}
        
        ------------- Informations utiles
        
        Attention, il vous sera demandé de créer un compte avant de rejoindre l’équipe.
        
        Afin de confirmer votre participation il est nécessaire de payer la caution :
        -\tMontant : 20€
        -\tCompte : ${iban}
        -\tCommunication : NOM Prénom
        Votre équipe sera considérée participante lorsque celle-ci possédera au moins un membre confirmé.
        
        Une équipe possède au maximum 5 membres.`;
    const messageHtml = `
        <h2>Bienvenue à l’édition 2021 de notre Hackathon !</h1>
        <h5>Site officiel : <a href="${domain}">${domain}</a></h6>
        
        <p>Vous recevez ce mail car l’on vous a envoyé une invitation à rejoindre une équipe :</p>
        
        <ul>
        <li>Nom : ${team.name}</li>
        </ul>
        <p>Vous pouvez rejoindre cette équipe en cliquant sur
        le <a href="${domain}/team/invite/${encodedToken}">lien</a> ou
        en entrant le code d’invitation
        dans la section « Mon équipe » de notre site.</p>
        <p>Code d’invitation : <strong>${encodedToken}</strong></p>
        
        <hr/>
        
        <h3>Informations utiles</h3>
        
        <p>Attention, il vous sera demandé de créer un compte avant de rejoindre l’équipe.</p>
        
        <p>Afin de confirmer votre participation il est nécessaire de payer la caution :</p>
        <ul>
        <li>Montant : 20€</li>
        <li>Compte : <b>${iban}</b></li>
        <li>Communication : <b>NOM Prénom</b></li>
        </ul>
        
        <p>Votre équipe sera considérée participante lorsque celle-ci possédera au moins un membre confirmé.</p>
        
        <p>Une équipe possède au maximum 5 membres.</p>`;
    await this.sendMail({
      to: newMemberEmail,
      subject: 'CSLabs Hackathon "Le Bien Vieillir" - Invitation',
      text: messagePlainText,
      html: messageHtml,
    });
  }
}
