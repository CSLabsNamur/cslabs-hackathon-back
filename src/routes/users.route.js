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
    const {
        firstName,
        lastName,
        github,
        linkedin,
        email,
        comment,
        password
    } = req.body;

    try {
        const user = await User.create({ firstName, lastName, github, linkedin, email, comment, password });

        req.session.user_id = user.id;

        console.log(`User added : #${user.id}.`);

        res.send(user_service.filter_private_data(user));
    } catch (err) {
        console.group(`Inscription invalide <${email ? email : "unknown"}>.`);

        let error_message;

        if (err.errors) {
            error_message = err.errors[0].message;
        } else {
            error_message = err.message;
        }

        console.log(`Erreur de validation : ${error_message}.`);
        console.groupEnd();
        return next(new ResponseException(error_message, 400));
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

router.post('/reset_password', async (req, res, next) => {

    const {email} = req.body;

    if (!email) {
        return next(new ResponseException('Missing email.', 400));
    }

    if (typeof email !== 'string') {
        return next(new ResponseException('Malformed email.', 400));
    }

    let user;
    try {
        user = await User.findOne({where: {email: email}})
    } catch (err) {
        return next(new ResponseException('Failed to fetch user.', 500));
    }

    if (!user) {
        res.send();
        return;
    }

    let token;
    try {
        token = await user_service.get_password_reset_token(user);
    } catch (err) {
        return next(new ResponseException('Failed to generate token.', 500));
    }

    try {
        await user_service.send_reset_password_mail(user, token);
        res.send();
    } catch (err) {
        return next(new ResponseException('Failed to send the mail.', 500));
    }
});

router.post('/change_password', async (req, res, next) => {

    const {token, new_password} = req.body;

    if (!token) {
        return next(new ResponseException('Missing token.', 400));
    }

    if (typeof token !== 'string') {
        return next(new ResponseException('Malformed token.', 400));
    }

    if (!new_password) {
        return next(new ResponseException('Missing new password.', 400));
    }

    if (typeof new_password !== 'string') {
        return next(new ResponseException('Malformed new password.', 400));
    }

    const user = await user_service.get_user_from_reset_password_token(token);

    if (!user) {
        return next(new ResponseException('Invalid token.', 400));
    }

    try {
        user.password = new_password;
        await user.save();
    } catch (err) {
        console.log(err.message);
        return next(new ResponseException('Invalid new password.', 400));
    }

    res.send();
});

module.exports = router;
