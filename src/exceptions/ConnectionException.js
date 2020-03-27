
module.exports = class ConnectionException extends Error {

    constructor(message) {
        super();

        console.error(message);

        this.message = message;
    }

};
