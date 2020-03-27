
// Import the libraries
const path = require('path');
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
}

// Set-up the database connection pool.
Database.sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve('./data/db.sqlite')
});

// Set-up the available data types from sequelize.
Database.DataTypes = DataTypes;

// Export the database
module.exports = Database;

