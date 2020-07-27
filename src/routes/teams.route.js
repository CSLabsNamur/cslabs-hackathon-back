const {Router} = require('express');

const ResponseException = require('../exceptions/ResponseException');
const auth = require('../middleware/authentication.handler');
const team_service = require('../services/team.service');
const user_service = require('../services/user.service');
const {User, Team} = require('../models/dao');

const router = Router();

/**
 * Get all the teams.
 */
router.get('/', auth, async (req, res, next) => {
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
        next(new ResponseException('Failed to fetch the teams.', 500));
    }
});

/**
 * Get the team of the active user.
 */
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
            return user_service.filter_public_data(member);
        });
    } catch (err) {
        return next(new ResponseException('Failed to fetch the members of the team.', 500));
    }

    res.send({
        id: team.id,
        name: team.name,
        description: team.description,
        idea: team.idea,
        members: team_members,
        token: team.token
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

/**
 * Make the active user joins a team from a specific token.
 */
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

/**
 * Remove a user from its team.
 * The active user must be the team owner or the removed user.
 * The team owner cannot leave its team.
 */
router.post('/leave/:user_id', auth, async (req, res, next) => {

    const { user_id } = req.params;

    let user;

    try {
        user = await User.findOne({where: {id: user_id}});
        await team_service.remove_user(req.user, user);
    } catch (err) {
        return next(new ResponseException('This user cannot be removed from the team.', 400));
    }

    res.send();
});

/**
 * Update the active user's team.
 */
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

/**
 * Create a new team and make the active user its owner.
 */
router.post('/create', auth, async (req, res, next) => {

    const {name, description, idea, invitations} = req.body;

    if (req.user.teamId) {
        return next(new ResponseException('The user have already a team.', 400));
    }

    if (!Array.isArray(invitations)) {
        return next(new ResponseException('The invitations must be an array.', 400));
    }

    for (const invitation of invitations) {
        if (typeof invitation !== 'string') {
            return next(new ResponseException('Each invitations must be a string.', 400));
        }
    }

    let team;

    try {
        team = await team_service.create_team(req.user, name, description, idea, invitations);
    } catch (err) {
        return next(new ResponseException('Failed to create the team.', 400));
    }

    res.send({id: team.id, name, description, idea, token: team.token});
});

module.exports = router;
