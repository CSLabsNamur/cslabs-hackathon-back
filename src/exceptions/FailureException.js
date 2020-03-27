
module.exports = class FailureException extends Error {

    constructor(message) {
        super();

        this.message = message;
    }

};
