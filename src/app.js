
const body_parser = require('body-parser');
const cookieSession = require('cookie-session');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const helmet = require('helmet');
const http = require('http');

const routes = require('./routes');
const dao = require('./models/dao');
const error_handler = require('./middleware/error.handler');

const PORT = 8080;
dotenv.config();

const app = express();
const server = http.createServer(app);

// Check that the env variables are loaded

if (process.env.SERVER_TEST !== 'success') {
    console.error('Missing or wrong ".env" file.');
    process.exit(-1);
}

// Initialize the middleware

app.use(cors()); // TODO: add origin
app.use(helmet());
app.use(cookieSession({
    name: 'session',
    keys: ['secret_1', 'secret_2'],
    maxAge: 2*3600*1000,
    secure: false // TODO: Set to true with HTTPS
}));
app.use(body_parser.json());

// Initialize the routes
app.use('/', routes);

// Error handling
app.use(error_handler);

async function start_server() {

    // Initialize the models
    await dao.init();
    console.info('Models properly initialized.');

    // Run the server at the given port.
    await new Promise((resolve, reject) => {
        server.listen(PORT, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Server is listening on port ${PORT}...`);
                resolve();
            }
        })
    });
}

// Start the server
start_server().then(() => {
    console.info('Server successfully started.');
}).catch(err => {
    console.error(err);
    console.error(`An error occurred and the server could not start.`);
    process.exit(-1);
});
