
const nodemailer = require('nodemailer');

class MailService {

    static async sendMail() {

        const message = {
                from: `Hackathon Server <${process.env.SERVER_MAIL_USR}>`,
                to: 'Someone <destination@example.com>',
                subject: 'Test message',
                text: 'For users with plaintext support only',
                html: '<h1>Hello world!</h1>'
        };

        try {
            await MailService.transporter.sendMail(message);
            console.info('Mail sent!');
        } catch (err) {
            console.error(err);
            console.error('Failed to send the mail.');
        }
    }

}

// TODO: Use oAuth2
MailService.transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    debug: true,
    logger: true,
    auth: {
        user: process.env.SERVER_MAIL_USR,
        pass: process.env.SERVER_MAIL_PSW
    }
});

module.exports = MailService;
