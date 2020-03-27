
const {Router} = require('express');

const users_route = require('./users.route');
const teams_route = require('./teams.route');

const router = Router();

// Define the routes

router.use('/users', users_route);
router.use('/teams', teams_route);

// 404 error route
router.use((req, res) => {
    res.status(404).send('Page not found.');
});

// Export the router
module.exports = router;
