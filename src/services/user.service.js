
const {check_data} = require('./encryption.service');

class UserService {
    static async check_password(user, password) {
        return await check_data(password, user.password);
    }

    static filter_public_data(user) {
        const {id, firstName, lastName, github, linkedin, teamId, teamOwner} = user;
        return {id, firstName, lastName, github, linkedin, teamId, teamOwner};
    }

    static filter_private_data(user) {
        const {id, email, firstName, lastName, github, linkedin, teamId, teamOwner} = user;
        return {id, email, firstName, lastName, github, linkedin, teamId, teamOwner};
    }

}

module.exports = UserService;
