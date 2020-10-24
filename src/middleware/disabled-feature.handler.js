
const ResponseException = require('../exceptions/ResponseException');

module.exports = (req, res, next) => {

    if (req.user && req.user.admin) {
        return next();
    }

    return next(new ResponseException('This feature is disabled.', 503));
}
