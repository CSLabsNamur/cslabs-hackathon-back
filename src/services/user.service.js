
const {check_data} = require('./encryption.service');

class UserService {
    static async check_password(user, password) {
        return await check_data(password, user.password);
    }
}

module.exports = UserService;
