
const {Router} = require('express');
const ResponseException = require('../exceptions/ResponseException');

const router = Router();

router.use((err, req, res, next) => {
    if (err instanceof ResponseException) {
        console.log('TEST');
        console.error(err.message);
        res.status(err.status).send();
    } else {
        console.error(err);
        res.status(500).send();
    }
});

module.exports = router;
