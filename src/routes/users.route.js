const { Router } = require('express');

const ResponseException = require('../exceptions/ResponseException');
const user_service = require('../services/user.service');
const team_service = require('../services/team.service');
const auth = require('../middleware/authentication.handler');
const admin = require('../middleware/admin.handler');

const { User, Team } = require('../models/dao');

const router = Router();

router.get('/', auth, admin, async (req, res, next) => {

    let users;

    try {
        users = await User.findAll({ raw: true });
    } catch (err) {
        next(new ResponseException('Failed to fetch the users.', 500));
    }

    users = users.map(async user => {

        const team = await Team.findOne({where: {id: user.teamId}, raw: true});

        return {
            ...user_service.filter_private_data(user),
            team: !!team ? {
                name: team.name,
                valid: team.valid
            }: null
        }
    });

    Promise.all(users).then(result => {
        res.send(result);
    }).catch(err => {
        console.error(err);
        next(new ResponseException('Failed to fetch the teams.', 500));
    });

});

router.get('/me', auth, async (req, res) => {

    /** @namespace req.user **/

    res.send(user_service.filter_private_data(req.user));
});

router.post('/add', async (req, res, next) => {
    const { firstName, lastName, github, linkedin, email, password } = req.body;

    try {
        const user = await User.create({ firstName, lastName, github, linkedin, email, password });

        req.session.user_id = user.id;

        res.send(user_service.filter_private_data(user));
    } catch (err) {
        console.error(err);
        next(new ResponseException('Failed to add the user.', 400));
    }

});

router.post('/update/me', auth, async (req, res, next) => {
    const { firstName, lastName, github, linkedin } = req.body;

    /** @namespace req.user **/

    try {

        const user = req.user;

        user.firstName = firstName;
        user.lastName = lastName;
        user.github = github.length > 0 ? github : null;
        user.linkedin = linkedin.length > 0 ? linkedin : null;

        await user.save();

        res.send(user_service.filter_private_data(user));
    } catch (err) {
        console.error(err);
        next(new ResponseException('Failed to update the user.', 400));
    }

});

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;
    const session_id = req.session.user_id;

    try {

        if (email && password) {

            const user = await User.findOne({
                where: { email: email.toLowerCase() },
                raw: true
            });

            if (!user || !await user_service.check_password(user, password)) {
                return next(new ResponseException('Wrong credentials.', 400));
            } else {
                req.session.user_id = user.id;
                res.send(user_service.filter_private_data(user));
            }

        } else if (session_id) {

            const user = await User.findOne({
                where: { id: session_id },
                raw: true
            });

            if (!user) {
                return next(new ResponseException('Wrong session ID.', 500));
            }
            res.send(user_service.filter_private_data(user));

        } else {
            return next(new ResponseException('Missing credentials.', 400));
        }

    } catch (err) {
        console.error(err);
        return next(new ResponseException('Failed to fetch the user.', 500));
    }
});

router.post('/logout', auth, (req, res) => {
    res.clearCookie('user_id');
    res.send();
});

router.post('/:user_id/caution', auth, admin, async (req, res, next) => {

    const { user_id } = req.params;
    const { paid } = req.body;

    if (typeof paid !== 'boolean') {
        return next(new ResponseException('Missing paid JSON value.', 400));
    }

    let user;

    try {
        user = await User.findOne({where: {id: user_id}});

        if (!user) {
            return next(new ResponseException('Invalid user id.', 400));
        }
    } catch (err) {
        return next(new ResponseException('Server failed to fetch the user.', 500));
    }

    try {
        if (user.paid_caution !== paid) {
            user.paid_caution = paid;
            await user.save();
        }
    } catch (err) {
        return next(new ResponseException('Server failed to update the user.', 500));
    }

    let team;
    try {
        team = await Team.findOne({where: {id: user.teamId}});

        if (team) {
            await team_service.update_team_validity(team);
        }

    } catch (err) {
        console.log('TEST2');
        return next(new ResponseException('Server failed to update the team validity.', 500));
    }

    res.send();
});

router.post('/:user_id/delete', auth, admin, async (req, res, next) => {
    
    const {user_id} = req.params;
    
    let user;
    
    try {
        user = await User.findOne({where: {id: user_id}});
    } catch (err) {
        return next(new ResponseException('Failed to fetch the user.', 500));
    }

    if (!user) {
        return next(new ResponseException('Wrong user id.', 400));
    }
    
    let team = null;

    if (user.teamId) {
        try {
            team = await Team.findOne({where: {id: user.teamId}});
        } catch (err) {
            return next(new ResponseException('Failed to fetch the team.', 500));
        }
    }

    try {
        await user_service.remove_user(user, team);
    } catch (err) {
        return next(new ResponseException('Failed to delete the user.', 500));
    }

    res.send(user_service.filter_private_data(user));
});

module.exports = router;
