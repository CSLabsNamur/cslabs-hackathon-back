
const {check_data} = require('./encryption.service');

class UserService {

    static filter_public_data({id, firstName, lastName, github, linkedin, teamId, teamOwner}) {
        return {id, firstName, lastName, github, linkedin, teamId, teamOwner};
    }

    static filter_teammates_data({id, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution}) {
        return {id, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution};
    }

    static filter_private_data({id, email, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution}) {
        return {id, email, firstName, lastName, github, linkedin, teamId, teamOwner, paid_caution};
    }

    static async check_password(user, password) {
        return await check_data(password, user.password);
    }

}

module.exports = UserService;
