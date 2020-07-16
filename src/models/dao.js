
const db = require('./database');

const UserModel = require('./user.model');
const TeamModel = require('./team.model');

class Dao {
    static async init() {
        console.debug('Initialize the models.');
        await db.init();
        await db.synchronize();
    }

    static get getDatabase() {
        return db;
    }
}

module.exports = Dao;
module.exports.User = UserModel(db.sequelize, db.DataTypes);
module.exports.Team = TeamModel(db.sequelize, db.DataTypes);
