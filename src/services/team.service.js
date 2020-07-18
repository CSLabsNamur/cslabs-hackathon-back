
const { nanoid } = require('nanoid/async');
const { hash_data, check_data } = require('./encryption.service');

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

    static async create_team(team_owner, name, description, idea) {

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

        return team;
    }
}

module.exports = TeamService;
