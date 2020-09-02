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

        /** @namespace req.user **/

        teams = teams
            .filter(team => team.valid || req.user.admin)
            .map(async team => {
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
        return next(new ResponseException('Failed to fetch the teams.', 500));
    }
});

/**
 * Get the information about a specified team.
 */
router.get('/info/:team_id', auth, async (req, res, next) => {

    let team;

    try {
        team = await Team.findOne({where: {id: req.params.team_id}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the team.', 500));
    }

    if (!team) {
        return next(new ResponseException('Wrong team id.', 400));
    }

    try {
        const members = await team_service.get_team_members(team);
        team.members = members.map(user_service.filter_public_data);
    } catch (err) {
        return next(new ResponseException('Failed to fetch the team members.', 500));
    }

    res.send(team_service.filter_public_data(team));
});

/**
 * Get the team of the active user.
 */
router.get('/me', auth, async (req, res, next) => {

    /** @namespace req.user **/

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
            return user_service.filter_teammates_data(member);
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
        token: team.token,
        valid: team.valid
    });
});

router.post('/invite/:team_id', auth, async (req, res, next) => {

    const {team_id} = req.params;

    /** @namespace req.user **/

    if (!req.user.admin) {
        if (!req.user.teamOwner) {
            return next(new ResponseException('The user is not the owner of the team.', 400));
        }
        if (req.user.teamId.toString() !== team_id) {
            return next(new ResponseException('The user is not a member of the team.', 400));
        }
    }

    const {email} = req.body;

    if (!email) {
        return next(new ResponseException('Missing email for invitation.', 400));
    }

    let team;

    try {
        team = await Team.findOne({where: {id: team_id}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the team.', 500));
    }

    if (!team) {
        return next(new ResponseException('Wrong team id.', 400));
    }

    try {
        await team_service.invite_user(team, email);
    } catch (err) {
        return next(new ResponseException('Failed to send invitation.', 500));
    }

    res.send();
});

router.post('/vote/:team_id', auth, async (req, res, next) => {
    const {team_id} = req.params;

    /** @namespace req.user **/

    if (!req.user.teamId) {
        return next(new ResponseException('It is required to be in a team for voting.', 400));
    }

    if (req.user.teamId === team_id) {
        return next(new ResponseException('Voting for its own team is forbidden.', 400));
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

    /** @namespace req.user **/

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
 * The active user must be the team owner or the removed user, or the active user is an administrator.
 * The team owner cannot leave its team.
 */
router.post('/leave/:user_id', auth, async (req, res, next) => {

    const { user_id } = req.params;

    /** @namespace req.user **/

    let user;

    try {
        user = await User.findOne({where: {id: user_id}});
        await team_service.remove_member(req.user, user);
    } catch (err) {
        return next(new ResponseException('This user cannot be removed from the team.', 400));
    }

    res.send();
});

/**
 * Update an user's team.
 * The active user must be the team owner or an administrator.
 */
router.post('/update', auth, async (req, res, next) => {

    /** @namespace req.user **/

    const {name, description, idea} = req.body;
    let team_id;

    // Check the team id and the user legitimacy.
    if (req.user.admin) {
        if (!req.body.id) {
            return next(new ResponseException('The administrator must provides the team id in the request body.', 400));
        }
        team_id = req.body.id;
    } else {
        if (!req.user.teamId || !req.user.teamOwner) {
            return next(new ResponseException('The user is not a team owner.', 400));
        }
        team_id = req.user.teamId;
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
        await team.save();
    } catch (err) {
        return next(new ResponseException('Validation failed for the new values.', 400));
    }

    res.send({id: team_id, name, description, idea, members: team.members});
});

/**
 * Create a new team and make the active user its owner.
 */
router.post('/create', auth, async (req, res, next) => {

    const {name, description, idea, invitations} = req.body;

    /** @namespace req.user **/

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

router.post('/delete/:team_id', auth, async (req, res, next) => {

    const {team_id} = req.params;

    /** @namespace req.user **/

    if (!req.user.admin) {
        if (!req.user.teamOwner) {
            return next(new ResponseException('The user is not the team owner.', 400));
        }

        if (req.user.teamId.toString() !== team_id) {
            return next(new ResponseException('Wrong team id.', 400));
        }
    }

    let team;

    try {
        team = await Team.findOne({where: {id: team_id}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the team.', 500));
    }

    if (!team) {
        return next(new ResponseException('Wrong team id.', 400));
    }

    try {
        await team_service.remove_team(team);
    } catch (err) {
        return next(new ResponseException(err.message, 500));
    }

    res.send(team_service.filter_public_data(team));
});

module.exports = router;
