
// Import the libraries
const {Sequelize, DataTypes} = require('sequelize');

// Import the exceptions
const ConnectionException = require('../exceptions/ConnectionException');

class Database {
    static async init() {

        console.time('Database initialization');
        console.info('Initialize the connection to the database.');

        // Test the connection with the database.
        try {
            await Database.sequelize.authenticate();
            console.info('Database authenticated.');
        } catch (err) {
            throw new ConnectionException('Database connection failed.');
        }
        console.timeEnd('Database initialization');
    }

    static async synchronize() {

        console.group('Database synchronization');
        console.time('Database synchronization');
        console.info('Synchronize the database.');

        // Create the tables from the models.
        try {
            await Database.sequelize.sync();
            console.log('Tables are created.');
        } catch (err) {
            throw new ConnectionException(`Table creation failed: ${err}.`);
        }
        console.timeEnd('Database synchronization');
        console.groupEnd();
    }

    static async createTransaction() {
        try {
            return await Database.sequelize.transaction();
        } catch (err) {
            throw new ConnectionException('Failed to create database transaction.');
        }
    }
}

// Set-up the database connection pool.
Database.sequelize = new Sequelize(
    process.env.SERVER_DB_NAME,
    process.env.SERVER_DB_USR,
    process.env.SERVER_DB_PASS, {
        dialect: 'mariadb',
        pool: {
            min: 0,
            max: 5,
            idle: 10000
        },
        define: {
            charset: 'utf8',
            timestamps: false
        },
        benchmark: false,
        logging: false
    });

// Set-up the available data types from sequelize.
Database.DataTypes = DataTypes;

// Export the database
module.exports = Database;

