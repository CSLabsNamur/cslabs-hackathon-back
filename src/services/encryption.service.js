
const bcrypt = require('bcrypt');

class EncryptionService {

    static async hash_data(data) {
        return await bcrypt.hash(data, 10);
    };

    static async check_data(data, valid_hash) {
        return await bcrypt.compare(data, valid_hash);
    };

    static str_to_base64(data) {
        const buffer = Buffer.from(data.toString());
        return buffer.toString('base64');
    }

    static base64_to_str(data) {
        const buffer = Buffer.from(data.toString(), 'base64');
        return buffer.toString('utf8');
    }

}

module.exports = EncryptionService;
