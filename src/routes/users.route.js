const { Router } = require('express');

const ResponseException = require('../exceptions/ResponseException');
const user_service = require('../services/user.service');
const auth = require('../middleware/authentication.handler');

const { User } = require('../models/dao');

const router = Router();

// TODO: Remove this route
router.get('/', async (req, res, next) => {

    try {
        let users = await User.findAll({ raw: true });

        res.send(users);
    } catch (err) {
        next(new ResponseException('Failed to fetch the users.', 500));
    }

});

router.get('/me', auth, async (req, res) => {
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

module.exports = router;
