
const {Router} = require('express');

const ResponseException = require('../exceptions/ResponseException');
const auth = require('../middleware/authentication.handler');
const team_service = require('../services/team.service');
const {User, Team} = require('../models/dao');

const router = Router();

// TODO: remove this route
router.get('/', async (req, res, next) => {
    try {
        const teams = await Team.findAll({raw: true});

        res.send(teams);
    } catch (err) {
        next(new ResponseException('Failed to fetch the users.', 500));
    }
});

router.get('/:team_id', auth, async (req, res, next) => {
    const {team_id} = req.params;

    if (!req.user.teamId) {
        return res.send({});
    }

    let team;

    try {
        team = await Team.findOne({where: {id: req.user.teamId}});
    } catch (err) {
        next(new ResponseException('Failed to fetch the user\'s team.', 500));
    }

    if (team.id.toString() !== team_id) {
        return next(new ResponseException('Wrong team id.', 400));
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
        next(new ResponseException('Failed to fetch the members of the team.', 500));
    }

    res.send({id: team.id, name: team.name, members: team_members});
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

router.post('/join/:team_id', auth, async (req, res, next) => {
    const {token} = req.body;
    const {team_id} = req.params;

    if (req.user.teamId) {
        return next(new ResponseException('User have already a team.', 400));
    }

    if (!token) {
        return next(new ResponseException('Missing token.', 400));
    }

    let team;
    try {
        team = await Team.findOne({where: {id: team_id}});
    } catch (err) {
        return next(new ResponseException('Failed to find the team.', 400));
    }

    try {
        if (!await team_service.check_token(team, token)) {
            return next(new ResponseException('Wrong token.', 400));
        }
    } catch (err) {
        return next(new ResponseException('Failed to check the token.', 500));
    }

    try {
        req.user.teamId = team.id;
        req.user.save();
        res.send({id: team_id, name: team.name});
    } catch (err) {
        return next(new ResponseException('Failed to update the user team.', 500));
    }
});

router.post('/leave', auth, async (req, res, next) => {

    if (!req.user.teamId) {
        return next(new ResponseException('The user does not have any team.'))
    }

    try {
        req.user.teamId = null;
        req.user.voteId = null;
        req.user.save();
    } catch (err) {
        return next(new ResponseException('Failed to update the user\'s team.', 500));
    }

    res.send();
});

router.post('/create', auth, async (req, res, next) => {

    const {team_name} = req.body;

    if (req.user.teamId) {
        return next(new ResponseException('The user have already a team.', 400));
    }

    let team;

    try {
        team = await team_service.create_team(req.user, team_name);
    } catch (err) {
        next(new ResponseException('Failed to create the team.', 400));
    }

    res.send({id: team.id, name: team.name, token: team.token});
});

module.exports = router;
