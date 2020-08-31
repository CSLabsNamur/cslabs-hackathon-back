
const nodemailer = require('nodemailer');

class MailService {

    static async initialize() {

        console.group('SMTP server connection.');

        const smtp_options = {
            service: 'gmail',
            port: 465,
            secure: true,
            debug: false,
            logger: false,
            auth: {
                user: process.env.SERVER_MAIL_USR,
                pass: process.env.SERVER_MAIL_PASS
            }
        };

        MailService.transporter = nodemailer.createTransport(smtp_options);
        console.log('Mail transporter created.');

        try {
            await MailService.transporter.verify();
            console.log('Mail service is successfully connected.');
        } catch (err) {
            console.error(`Failed to connect to the mail service.\n ${err}.`);
            process.exit(-1);
        }

        console.groupEnd();
    }

    static async sendMail(
        receiver_mail,
        message_subject,
        message_html,
        message_plain_text
    ) {

        const message = {
                from: `Hackathon Server <${process.env.SERVER_MAIL_USR}>`,
                to: `<${receiver_mail}>`,
                subject: message_subject,
                text: message_plain_text,
                html: message_html
        };

        await MailService.transporter.sendMail(message);
    }

}

module.exports = MailService;
