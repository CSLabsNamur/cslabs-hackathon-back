const {nanoid} = require('nanoid/async');

const mail_service = require('./mail.service');
const dao = require('../models/dao');
const {Team, User} = dao;

class TeamService {

    static filter_public_data({name, description, idea, members}) {
        return {name, description, idea, members};
    }

    static async get_team_by_token(token) {
        return await Team.findOne({where: {token: token}});
    }

    static async get_team_members(team) {
        try {
            return await User.findAll({where: {teamId: team.id}});
        } catch (err) {
            throw new Error('Failed to fetch the team members.');
        }
    }

    static async generate_team_token() {
        let token;
        let team;

        do {
            token = await nanoid(20);
            team = await this.get_team_by_token(token);
        } while (team);

        return token;
    }

    static async create_team(team_owner, name, description, idea, invitations) {

        let team;

        const token = await this.generate_team_token()

        try {
            team = await Team.build({
                name,
                description,
                idea,
                token,
                valid: team_owner.paid_caution
            });
        } catch (err) {
            console.error(err);
            throw new Error('Failed to create the team.');
        }

        const transaction = await dao.getDatabase.createTransaction();

        try {
            team = await team.save();
        } catch (err) {
            await transaction.rollback();

            if (err.errors) {
                throw new Error(err.errors[0].message);
            }

            throw new Error('Failed to save the team.');
        }

        team_owner.teamId = team.id;
        team_owner.teamOwner = true;

        try {
            await team_owner.save();
        } catch (err) {
            await transaction.rollback();
            throw new Error('Failed to update the user.');
        }

        try {
            const invitation_tasks = invitations.map(inv => TeamService.invite_user(team, inv));
            await Promise.all(invitation_tasks);
        } catch (err) {
            throw new Error('Failed to send invitations.');
        }

        return team;
    }

    static async invite_user(team, user_mail) {

        const message_plain = `
        Bienvenue à l’édition 2020 de notre Hackathon !
        Site officiel : ${process.env.SERVER_PUBLIC_URL}
        
        Vous recevez ce mail car l’on vous a envoyé une invitation à rejoindre une équipe :
        -\tNom : ${team.name}
        Vous pouvez rejoindre cette équipe en cliquant sur
        le lien [${process.env.SERVER_PUBLIC_URL}/team/invite/${team.token}] ou en entrant le code d’invitation
        dans la section « Mon équipe » de notre site.
        
        Code d’invitation : ${team.token}
        
        ------------- Informations utiles
        
        Attention, il vous sera demandé de créer un compte avant de rejoindre l’équipe.
        
        Vous recevrez un mail de confirmation lorsque vous aurez rejoint l’équipe.
        
        Afin de confirmer votre participation il est nécessaire de payer la caution :
        -\tMontant : 20€
        -\tCompte : ${process.env.SERVER_CAUTION_ACCOUNT}
        -\tCommunication : NOM Prénom
        Votre équipe sera considérée participante lorsque celle-ci possédera au moins un membre confirmé.
        
        Une équipe possède au maximum 5 membres.`;

        const message_html = `
        <h2>Bienvenue à l’édition 2020 de notre Hackathon !</h1>
        <h5>Site officiel : <a href="${process.env.SERVER_PUBLIC_URL}">${process.env.SERVER_PUBLIC_URL}</a></h6>
        
        <p>Vous recevez ce mail car l’on vous a envoyé une invitation à rejoindre une équipe :</p>
        
        <ul>
        <li>Nom : ${team.name}</li>
        </ul>
        <p>Vous pouvez rejoindre cette équipe en cliquant sur
        le <a href="${process.env.SERVER_PUBLIC_URL}/team/invite/${team.token}">lien</a> ou
        en entrant le code d’invitation
        dans la section « Mon équipe » de notre site.</p>
        <p>Code d’invitation : <strong>${team.token}</strong></p>
        
        <hr/>
        
        <h3>Informations utiles</h3>
        
        <p>Attention, il vous sera demandé de créer un compte avant de rejoindre l’équipe.</p>
        
        <p>Vous recevrez un mail de confirmation lorsque vous aurez rejoint l’équipe.</p>
        
        <p>Afin de confirmer votre participation il est nécessaire de payer la caution :</p>
        <ul>
        <li>Montant : 20€</li>
        <li>Compte : <b>${process.env.SERVER_CAUTION_ACCOUNT}</b></li>
        <li>Communication : <b>NOM Prénom</b></li>
        </ul>
        
        <p>Votre équipe sera considérée participante lorsque celle-ci possédera au moins un membre confirmé.</p>
        
        <p>Une équipe possède au maximum 5 membres.</p>
        `;

        try {
            await mail_service.sendMail(
                user_mail,
                'Invitation dans une équipe - Hackathon CSLabs',
                message_html,
                message_plain);
        } catch (e) {
            console.error(`Failed to send an email to: <${user_mail}>.`);
        }

        console.log(`Invite <${user_mail}> to the team : [${team.name}].`);
    }

    static async remove_member(user, removed_user) {

        if (!user.teamOwner && user.id !== removed_user.id && !user.admin) {
            throw new Error('The user is not the team owner or the removed user or an administrator.');
        }

        if (!user.admin && (user.teamId !== removed_user.teamId)) {
            throw new Error('The removed user is not in the same team that the owner.');
        }

        if (removed_user.teamOwner) {
            throw new Error('The removed user cannot be the team owner.');
        }

        const team_id = removed_user.teamId;

        const transaction = await dao.getDatabase.createTransaction();

        removed_user.teamId = null;
        removed_user.teamOwner = false;
        await removed_user.save();

        let team;

        try {
            team = await Team.findOne({where: {id: team_id}});
            await this.update_team_validity(team);
        } catch (err) {
            await transaction.rollback();
            throw new Error('Failed to update the team validity.');
        }
    }

    static async update_team_validity(team, team_members) {

        if (!team) {
            throw new Error('The team is a null variable.');
        }

        let members;

        if (team_members) {
            members = team_members;
        } else {
            members = await this.get_team_members(team);
        }

        const valid = members.some(user => user.paid_caution);

        if (team.valid !== valid) {
            try {
                team.valid = valid;
                await team.save();
            } catch (err) {
                throw new Error('Failed to update the team validity.');
            }
        }
    }

    static async remove_team(team) {
        const members = await this.get_team_members(team);

        // Remove the members from the team.
        await Promise.all(members.map(async member => {
            member.teamId = null;
            member.teamOwner = false;
            await member.save();
        }));

        // Delete the team.
        try {
            await Team.destroy({where: {id: team.id}});
        } catch (err) {
            throw new Error('Failed to remove the team from the database.');
        }

    }

}

module.exports = TeamService;
