
module.exports = class FailureException extends Error {

    constructor(message, status, log=true) {
        super();

        if (log) {
            console.error(`The server responds an error ${status} to a client: ${message}`);
        }

        this.message = message;
        this.status = status;
        this.response = {message}
    }

};
