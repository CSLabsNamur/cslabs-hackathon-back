
const body_parser = require('body-parser');
const cookieSession = require('cookie-session');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const helmet = require('helmet');
const http = require('http');

dotenv.config();

const routes = require('./routes');
const dao = require('./models/dao');
const error_handler = require('./middleware/error.handler');

const mail_service = require('./services/mail.service');

const PORT = 8080;

const app = express();
const server = http.createServer(app);

// Check that the env variables are loaded

if (process.env.SERVER_TEST !== 'success') {
    console.error('Missing or wrong ".env" file.');
    process.exit(-1);
}

// Initialize the middleware

const corsOptions = {
    origin: [
        process.env.SERVER_PUBLIC_URL,
        process.env.SERVER_API_URL
    ],
    credentials: true
}

app.use(cors(corsOptions));
app.use(helmet());
app.use(cookieSession({
    name: 'session',
    resave: false,
    saveUninitialized: true,
    keys: [
        process.env.SERVER_COOKIE_SECRET_1,
        process.env.SERVER_COOKIE_SECRET_2
    ],
    maxAge: 24*3600*1000, // 1 day
    secureProxy: true,
    sameSite: 'strict'
}));

// Enable the json http body parser
app.use(body_parser.json());

// Initialize the routes
app.use('/', routes);

// Error handling
app.use(error_handler);

async function start_server() {

    // Initialize the models
    await dao.init();
    console.info('Models properly initialized.');

    await mail_service.initialize();
    console.info('Mail service initialized.');

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
