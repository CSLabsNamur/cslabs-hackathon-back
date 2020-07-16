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

router.get('/:user_id', auth, async (req, res, next) => {
    const { user_id } = req.params;

    if (req.user.id.toString() !== user_id) {
        next(new ResponseException('Wrong user id.', 400));
    } else {
        const { id, firstName, lastName, github, linkedin, email } = req.user;
        res.send({ id, firstName, lastName, github, linkedin, email });
    }
});

router.post('/add', async (req, res, next) => {
    const { firstName, lastName, github, linkedin, email, password } = req.body;

    try {
        const user = await User.create({ firstName, lastName, github, linkedin, email, password });

        req.session.user_id = user.id;

        res.send({ id: user.id, firstName, lastName, github, linkedin, email });
    } catch (err) {
        console.error(err);
        next(new ResponseException('Failed to add the user.', 400));
    }

});

router.post('/update', auth, async (req, res, next) => {
    // const { user_id } = req.params;
    const { firstName, lastName, github, linkedin, email } = req.body;

    try {
        let user = await User.findOne({
            where: { email: email },
            raw: false
        });

        user.firstName = firstName;
        user.lastName = lastName;
        user.github = github;
        user.linkedin = linkedin;
        // user.email = email;
        user.save().then((wtf) => { console.log("youhou") });
        console.log(user);

        // req.session.user_id = user.id;

        res.send({ id: user.id, firstName, lastName, github, linkedin, email });
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
                where: { email: email },
                raw: true
            });

            if (!user || !await user_service.check_password(user, password)) {
                return next(new ResponseException('Wrong credentials.', 400));
            } else {
                req.session.user_id = user.id;

                const {id, firstName, lastName, github, linkedin, email} = user;
                res.send({
                    id,
                    firstName,
                    lastName,
                    github,
                    linkedin,
                    email
                });
            }

        } else if (session_id) {

            const user = await User.findOne({
                where: { id: session_id },
                raw: true
            });

            if (!user) {
                return next(new ResponseException('Wrong session ID.', 500));
            }

            const {id, firstName, lastName, github, linkedin, email} = user;
            res.send({
                id,
                firstName,
                lastName,
                github,
                linkedin,
                email
            });

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
