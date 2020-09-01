
const {
    check_data,
    hash_data,
    base64_to_str,
    str_to_base64
} = require('./encryption.service');
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

    static async get_password_reset_token(user) {
        const reset_data = {
            email: user.email,
            old_hash: user.password
        }

        const hash = await hash_data(JSON.stringify(reset_data));

        // Return hash to base64
        return str_to_base64(JSON.stringify({
            email: user.email,
            signature: hash
        }));
    }

    static async get_user_from_reset_password_token(token) {

        const token_data = await UserService._decode_password_reset_token(token);

        if (!token_data) {
            return null;
        }

        let user;
        try {
            user = await User.findOne({where: {email: token_data.email}})
        } catch (err) {
            return null;
        }

        if (!user) {
            return null;
        }

        const validity = await UserService._check_password_reset_token_data(user, token_data);

        if (!validity) {
            return null;
        }

        return user;
    }

    static async _decode_password_reset_token(token) {
        try {
            // Get the hash from base64
            return JSON.parse(base64_to_str(token));
        } catch (err) {
            return null;
        }
    }

    static async _check_password_reset_token_data(user, token_data) {

        const reset_data = {
            email: user.email,
            old_hash: user.password
        }

        if (!token_data.email) {
            return false;
        }

        if (!token_data.signature) {
            return false;
        }

        if (token_data.email !== reset_data.email) {
            return false;
        }

        try {
            return await check_data(JSON.stringify(reset_data), token_data.signature);
        } catch (err) {
            return false;
        }

    }

}

module.exports = UserService;
