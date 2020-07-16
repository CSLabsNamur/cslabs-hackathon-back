
const { hash_data, check_data } = require('./encryption.service');

const dao = require('../models/dao');
const { Team } = dao;

class TeamService {

    static async generate_token(team) {
        const clear_token = TeamService.get_clear_token(team);
        const hash = await hash_data(clear_token);
        const buff = new Buffer.from(hash);
        return buff.toString('base64');
    }

    static get_clear_token(team) {
        const title = 'team-token';
        return `${title}:${team.id}:${team.name}`;
    }

    static async check_token(team, token) {

        if (typeof token !== 'string') {
            return false;
        }

        if (token.length > 1024) {
            return false;
        }

        try {
            const buff = new Buffer.from(token, 'base64');
            const hash = buff.toString('utf-16');
            const expected_token = TeamService.get_clear_token(team);
            return await check_data(expected_token, hash);
        } catch (err) {
            throw new Error('Token checking failed.');
        }
    }

    static async create_team(team_owner, name, description, idea) {

        let team;

        try {
            team = await Team.build({
                name,
                description,
                idea
            });
        } catch (err) {
            console.error(err);
            throw new Error('Failed to create the team.');
        }

        let token;
        try {
            token = await TeamService.generate_token(team);
            team.token = token;
        } catch (err) {
            throw new Error('Failed to generate the token');
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

        return team;
    }
}

module.exports = TeamService;
