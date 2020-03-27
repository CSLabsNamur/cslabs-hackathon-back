
const ResponseException = require('../exceptions/ResponseException');

module.exports = (err, req, res, next) => {

    if (!err) {
        next();
    }

    if (err instanceof ResponseException) {
        console.error(err.message);
        res.status(err.status).send(err.response);
    } else {
        console.error(err);
        res.status(500).send();
    }
};
