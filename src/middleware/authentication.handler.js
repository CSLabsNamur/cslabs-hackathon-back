
const ResponseException = require('../exceptions/ResponseException');
const {User} = require('../models/dao');

module.exports = async (req, res, next) => {
    const {user_id} = req.session;
    console.log(`HELLO ${user_id} !`)
    if (!user_id) {
        return next(new ResponseException('User is not authenticated.', 400));
    }

    const user = await User.findOne({
        where: {id: user_id}
    });

    if (!user) {
        return next(new ResponseException('Wrong authentication identifier.', 500));
    }

    req.user = user;

    next();
};
