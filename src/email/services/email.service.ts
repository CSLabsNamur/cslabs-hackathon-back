import { Injectable } from '@nestjs/common';
import Mail from 'nodemailer/lib/mailer';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Team } from '../../teams/entities/team.entity';
import {User} from "../../users/entities/user.entity";

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

  async sendRegistrationConfirmationMail(newUserEmail: string) {
    const domain = this.configService.get('FRONTEND_DOMAIN');
    const iban = this.configService.get('HACKATHON_IBAN');

    const messagePlainText = `
    Bienvenue à l’édition 2022 de notre Hackathon !
    Site officiel : ${domain}
    
    Vous recevez ce mail car vous vous êtes inscrit sur notre site.
    
    ------------- Informations utiles
        
    Attention, votre participation au hackathon n'est effective qu'à partir du moment où votre caution est payée.
    Vous pouvez vérifier la validation de votre caution sur votre profile (https://hackathon.cslabs.be/team/user).
    
    -\tMontant : 20€
    -\tCompte : ${iban}
    -\tCommunication : NOM Prénom
    
    Il vous est possible de créer une équipe, si vous le souhaitez, et d'y inviter vos amis.
    
    Une équipe est considérée participante lorsque celle-ci possède au moins un membre confirmé.
    Une équipe possède au maximum 5 membres.
    
    Si vous n'avez pas encore d'équipe, pas de panique ! Vous pouvez en constituer sur place le jour J ou bien via
    le discord officiel du Hackathon (https://discord.gg/Jf2Dht8). N'hésitez pas à rejoindre ce dernier afin de discuter avec nous !
    
    N'hésitez pas à prendre contact avec notre équipe via Discord ou via cette adresse email.
    
    Au plaisir de vous voir, l'équipe organisatrice.
    `;

    const messageHtml = `
    <h2>Bienvenue à l’édition 2022 de notre Hackathon !</h2>
    <h5>Site officiel : <a href="${domain}">${domain}</a></h6>
    
    <p>Vous recevez ce mail car vous vous êtes inscrit sur notre site.</p>
    
    ------------- Informations utiles
        
    <p>Attention, votre participation au hackathon n'est effective qu'à partir du moment où votre caution est payée.
    Vous pouvez vérifier la validation de votre caution sur <a href="https://hackathon.cslabs.be/team/user">votre profile</a>.</p>
    
    <ul>
    <li>Montant : 20€</li>
    <li>Compte : <b>${iban}</b></li>
    <li>Communication : <b>NOM Prénom</b></li>
    </ul>
    
    <p>Il vous est possible de créer une équipe, si vous le souhaitez, et d'y inviter vos amis.</p>
    
    <p>Une équipe est considérée participante lorsque celle-ci possède au moins un membre confirmé.</p>
    <p>Une équipe possède au maximum 5 membres.</p>
    
    <p>Si vous n'avez pas encore d'équipe, pas de panique ! Vous pouvez en constituer sur place le jour J ou bien via
    le <a href="https://discord.gg/Jf2Dht8">discord officiel du Hackathon</a>. N'hésitez pas à rejoindre ce dernier afin de discuter avec nous !</p>
    
    <p>N'hésitez pas à prendre contact avec notre équipe via Discord ou via cette adresse email.</p>
    
    <p>Au plaisir de vous voir, l'équipe organisatrice.</p>
    `;

    await this.sendMail({
      to: newUserEmail,
      subject: 'CSLabs Hackathon "Le Bien Vieillir" - Bienvenue !',
      text: messagePlainText,
      html: messageHtml,
    });
  }

  async sendTeamInvitation(team: Team, newMemberEmail: string) {
    const domain = this.configService.get('FRONTEND_DOMAIN');
    const iban = this.configService.get('HACKATHON_IBAN');
    const encodedToken = Buffer.from(team.token).toString('base64');
    const messagePlainText = `
        Bienvenue à l’édition 2022 de notre Hackathon !
        Site officiel : ${domain}
        
        Vous recevez ce mail car on vous a envoyé une invitation à rejoindre une équipe :
        -\tNom : ${team.name}
        Vous pouvez rejoindre cette équipe en cliquant sur
        le lien [${domain}/team/join/${encodedToken}] ou en entrant le code d’invitation
        dans la section « Mon équipe » de notre site.
        
        Code d’invitation : ${encodedToken}
        
        ------------- Informations utiles
        
        Attention, il vous sera demandé de créer un compte avant de rejoindre l’équipe.
        
        Afin de confirmer votre participation il est nécessaire de payer la caution :
        -\tMontant : 20€
        -\tCompte : ${iban}
        -\tCommunication : NOM Prénom
        
        Votre équipe sera considérée participante lorsque celle-ci possédera au moins un membre confirmé.
        Une équipe possède au maximum 5 membres.
        
        Si vous n'avez pas encore d'équipe, pas de panique ! Vous pouvez en constituer sur place le jour J ou bien via
        le discord officiel du Hackathon (https://discord.gg/Jf2Dht8).
        `;
    const messageHtml = `
        <h2>Bienvenue à l’édition 2022 de notre Hackathon !</h1>
        <h5>Site officiel : <a href="${domain}">${domain}</a></h6>
        
        <p>Vous recevez ce mail car l’on vous a envoyé une invitation à rejoindre une équipe :</p>
        
        <ul>
        <li>Nom : ${team.name}</li>
        </ul>
        <p>Vous pouvez rejoindre cette équipe en cliquant sur
        le <a href="${domain}/team/join/${encodedToken}">lien</a> ou
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
        <p>Une équipe possède au maximum 5 membres.</p>
        
        <p>Si vous n'avez pas encore d'équipe, pas de panique ! Vous pouvez en constituer sur place le jour J ou bien via
        le discord officiel du Hackathon (<a href="https://discord.gg/Jf2Dht8">https://discord.gg/Jf2Dht8</a>).</p>
        `;
    await this.sendMail({
      to: newMemberEmail,
      subject: 'CSLabs Hackathon "Le Bien Vieillir" - Invitation',
      text: messagePlainText,
      html: messageHtml,
    });
  }

  async sendPasswordReset(user: User, token: string) {
    const domain = this.configService.get('FRONTEND_DOMAIN');
    await this.sendMail({
      to: user.email,
      subject: 'CSLabs Hackathon "Le Bien Vieillir" - Réinitialiser le mot de passe',
      text: `
        Un nouveau mot de passe a été demandé pour l'utilisateur ${user.email} du site ${domain}.
        Si cette demande est de votre initiative, suivez ce lien afin de définir un nouveau mot de passe pour votre compte :
        ${domain}/password-reset/${token}
        `,
    });
  }

  async sendAdminAnnounce(subject: string, announce: string, emails: string[]) {
    await Promise.all(emails.map((email) => this.sendMail({
        to: email,
        subject: `CSLabs Hackathon "Le Bien Vieillir" - IMPORTANT : ${subject}`,
        text: announce,
      }))
    );
  }
}
