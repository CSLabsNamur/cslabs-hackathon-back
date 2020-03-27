
const bcrypt = require('bcrypt');

class EncryptionService {

    static async hash_data(data) {
        return await bcrypt.hash(data, 10);
    };

    static async check_data(data, valid_hash) {
        return await bcrypt.compare(data, valid_hash);
    };

}

module.exports = EncryptionService;
