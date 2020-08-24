
const {check_data} = require('./encryption.service');
const team_service = require('./team.service');
const dao = require('../models/dao');
const { Team, User } = dao;

class UserService {

    static filter_public_data({id, firstName, lastName, github, linkedin, teamId, teamOwner}) {
        return {id, firstName, lastName, github, linkedin, teamId, teamOwner};
    }

    static filter_teammates_data({id, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution}) {
        return {id, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution};
    }

    static filter_private_data({
            id,
            email,
            firstName,
            lastName,
            github,
            linkedin,
            teamId,
            teamOwner,
            paid_caution,
            admin,
            createdAt
        }) {

        const user_data = {id, email, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution, createdAt}

        if (admin) {
            user_data.admin = admin;
        }

        return user_data;
    }

    static async check_password(user, password) {
        return await check_data(password, user.password);
    }

    static async remove_user(user, team) {

        if (user.admin) {
            throw new Error("Unable to delete administrator.");
        }

        if (user.teamOwner) {
            throw new Error("Unable to delete team owner.");
        }

        const transaction = await dao.getDatabase.createTransaction();

        try {
            await User.destroy({where: {id: user.id}});
        } catch (err) {
            await transaction.rollback();
            throw new Error('Failed to destroy the user.');
        }

        if (team) {
            let members;

            try {
                members = await User.findAll({where: {teamId: team.id}});
            } catch (err) {
                await transaction.rollback();
                throw new Error('Failed to fetch the team members.');
            }

            try {
                await team_service.update_team_validity(team, members);
            } catch (err) {
                await transaction.rollback();
                throw new Error('Failed to update the team validity.');
            }
        }

    }

}

module.exports = UserService;
