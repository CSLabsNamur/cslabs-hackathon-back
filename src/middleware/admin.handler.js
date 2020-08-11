
const ResponseException = require('../exceptions/ResponseException');

module.exports = (req, res, next) => {

    if (!req.user) {
        return next(new ResponseException('User is not authenticated.', 400));
    }

    if (!req.user.admin) {
        return next(new ResponseException('User is not admin.', 400));
    }

    next();
}
