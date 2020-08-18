
const { nanoid } = require('nanoid/async');

const mail_service = require('./mail.service');
const dao = require('../models/dao');
const { Team, User } = dao;

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

        await this.update_team_validity(team);

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

        let team;

        try {
            team = await Team.findOne({where: {id: user.id}});
            await this.update_team_validity(team);
        } catch (err) {
            throw new Error('Failed to update the team validity.');
        }
    }

    static async update_team_validity(team, team_members) {

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
        const members = this.get_team_members(team);

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
