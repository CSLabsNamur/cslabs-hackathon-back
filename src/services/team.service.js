
const { nanoid } = require('nanoid/async');

const mail_service = require('./mail.service');
const dao = require('../models/dao');
const { Team } = dao;

class TeamService {

    static async get_team_by_token(token) {
        return await Team.findOne({where: {token: token}});
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
                token
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
        console.log(`Invite <${user_mail}> to the team : [${team.name}].`);
    }

    static async remove_user(user, removed_user) {

        if (!user.teamOwner && user.id !== removed_user.id) {
            throw new Error('The user is not the team owner or the removed user.');
        }

        if (user.teamId !== removed_user.teamId) {
            throw new Error('The removed user is not in the same team that the owner.');
        }

        if (removed_user.teamOwner) {
            throw new Error('The removed user cannot be the team owner.');
        }

        removed_user.teamId = null;
        removed_user.teamOwner = false;
        await removed_user.save();
    }
}

module.exports = TeamService;
