const {Router} = require('express');

const ResponseException = require('../exceptions/ResponseException');
const auth = require('../middleware/authentication.handler');
const team_service = require('../services/team.service');
const user_service = require('../services/user.service');
const {User, Team} = require('../models/dao');

const router = Router();

/**
 * Get the team of the current user.
 */
router.get('/', async (req, res, next) => {
    try {
        let teams = await Team.findAll({raw: true});

        teams = teams.map(async team => {
            return {
                ...team,
                members:
                    (await User.findAll({where: {teamId: team.id}, raw: true})).map(
                        user => user_service.filter_public_data(user)
                    )
            }
        });

        const results = await Promise.all(teams);
        res.send(results);
    } catch (err) {
        next(new ResponseException('Failed to fetch the users.', 500));
    }
});

router.get('/me', auth, async (req, res, next) => {

    const team_id = req.user.teamId;

    if (!team_id) {
        return res.send({});
    }

    let team;

    try {
        team = await Team.findOne({where: {id: req.user.teamId}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the user\'s team.', 500));
    }

    let team_members;

    try {
        team_members = await User.findAll({where: {teamId: team.id}});
        team_members = team_members.map(member => {
            return {
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName
            }
        });
    } catch (err) {
        return next(new ResponseException('Failed to fetch the members of the team.', 500));
    }

    res.send({
        id: team.id,
        name: team.name,
        description: team.description,
        idea: team.idea,
        members: team_members
    });
});

router.post('/vote/:team_id', auth, async (req, res, next) => {
    const {team_id} = req.params;

    if (!req.user.teamId) {
        return next(ResponseException('It is required to be in a team for voting.', 400));
    }

    if (req.user.teamId === team_id) {
        return next(ResponseException('Voting for its own team is forbidden.', 400));
    }

    let team;
    try {
        team = await Team.findOne({where: {id: team_id}});
    } catch (err) {
        return next('Failed to fetch the team.', 500);
    }

    if (!team) {
        return next('This team does not exist.', 400);
    }

    try {
        req.user.voteId = team_id;
        req.user.save();
    } catch (err) {
        return next('Failed to update the user\'s vote.', 500);
    }

    res.send({id: team_id, name: team.name});
});

router.post('/join', auth, async (req, res, next) => {
    const {token} = req.body;

    if (req.user.teamId) {
        return next(new ResponseException('The user has already a team.', 400));
    }

    if (!token) {
        return next(new ResponseException('Missing token.', 400));
    }

    let team;
    try {
        team = await Team.findOne({where: {token: token}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the team.', 500));
    }

    if (!team) {
        return next(new ResponseException('Invalid token.', 400));
    }

    try {
        req.user.teamId = team.id;
        req.user.teamOwner = false;
        await req.user.save();
    } catch (err) {
        return next(new ResponseException('Failed to update the user team.', 500));
    }

    res.send({
        id: team.id,
        name: team.name,
        description: team.description,
        idea: team.idea,
    });
});

router.post('/leave', auth, async (req, res, next) => {

    if (!req.user.teamId) {
        return next(new ResponseException('The user does not have any team.', 400));
    }

    try {
        req.user.teamId = null;
        req.user.teamOwner = false;
        req.user.voteId = null;
        req.user.save();
    } catch (err) {
        return next(new ResponseException('Failed to update the user\'s team.', 500));
    }

    res.send();
});

router.post('/update', auth, async (req, res, next) => {

    const {name, description, idea} = req.body;
    const team_id = req.user.teamId;

    if (!team_id || !req.user.teamOwner) {
        return next(new ResponseException('The user is not a team owner.', 400));
    }

    let team;

    try {
        team = await Team.findOne({where: {id: team_id}});
    } catch (err) {
        return next('Failed to fetch the team.', 500);
    }

    team.name = name;
    team.description = description;
    team.idea = idea;

    try {
        team.save();
    } catch (err) {
        return next('Wrong new values for the team.', 400);
    }

    res.send({id: team_id, name, description, idea, members: team.members});
});

router.post('/create', auth, async (req, res, next) => {

    const {name, description, idea} = req.body;

    if (req.user.teamId) {
        return next(new ResponseException('The user have already a team.', 400));
    }

    let team;

    try {
        team = await team_service.create_team(req.user, name, description, idea);
    } catch (err) {
        return next(new ResponseException('Failed to create the team.', 400));
    }

    res.send({id: team.id, name, description, idea, token: team.token});
});

module.exports = router;
