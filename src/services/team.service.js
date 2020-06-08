
const { hash_data, check_data } = require('./encryption.service');

const { Team } = require('../models/dao');

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

    static async create_team(team_creator, team_name, description_name, idea, description_idea) {

        let team;
        try {
            team = await Team.build({
                name: team_name,
                description_name: description_name,
                idea: idea,
                description_idea: description_idea,
            });
        } catch (err) {
            console.error(err);
            throw new Error('Failed to create the team.');
        }

        let token;
        try {
            token = await TeamService.generate_token(team);
        } catch (err) {
            throw new Error('Failed to generate the token');
        }

        // TODO: a transaction for data integrity

        try {
            team = await team.save();
        } catch (err) {
            throw new Error('Failed to save the team.');
        }

        team_creator.teamId = team.id;

        try {
            team_creator.save();
        } catch (err) {
            throw new Error('Failed to update the user.');
        }

        console.log(team_creator);

        team.token = token;

        return team;
    }
}

module.exports = TeamService;
