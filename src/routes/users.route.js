
const {Router} = require('express');

const ResponseException = require('../exceptions/ResponseException');
const user_service = require('../services/user.service');
const auth = require('../middleware/authentication.handler');

const {User} = require('../models/dao');

const router = Router();

// TODO: Remove this route
router.get('/', async (req, res, next) => {

    try {
        let users = await User.findAll({raw: true});

        res.send(users);
    } catch (err) {
        next(new ResponseException('Failed to fetch the users.', 500));
    }

});

router.get('/:user_id', auth, async (req, res, next) => {
    const {user_id} = req.params;

    if (req.user.id.toString() !== user_id) {
        next(new ResponseException('Wrong user id.', 400));
    } else {
        const {id, firstName, lastName, email} = req.user;
        res.send({id, firstName, lastName, email})
    }
});

router.post('/add', async (req, res, next) => {
    const {firstName, lastName, email, password} = req.body;

    try {
        const user = await User.create({firstName, lastName, email, password});

        req.session.user_id = user.id;

        res.send({id: user.id, firstName, lastName, email});
    } catch (err) {
        console.error(err);
        next(new ResponseException('Failed to add the user.', 400));
    }

});

router.post('/login', async (req, res, next) => {
    const {email, password} = req.body;

    try {
        let user = await User.findOne({
            where: {email: email},
            raw: true
        });

        if (!user) {
            next(new ResponseException('The user does not exist.', 400));
        } else if (!await user_service.check_password(user, password)) {
            next(new ResponseException('Wrong password.', 400));
        } else {
            req.session.user_id = user.id;

            const {id, firstName, lastName} = user;
            user =  {id, firstName, lastName, email};

            res.send(user);
        }
    } catch (err) {
        console.error(err);
        next(new ResponseException('Failed to fetch the user.', 500));
    }
});

router.post('/logout', auth, (req, res) => {
    res.clearCookie('user_id');
    res.send();
});

module.exports = router;
