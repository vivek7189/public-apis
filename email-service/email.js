// emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 25,
      secure: false,
      auth: {
        user: process.env.GODADY_EMAIL,
        pass: process.env.GODADY_PA
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail({ to, subject, text, html }) {
    console.log('process.env.GODADY_EMAIL,',process.env.GODADY_EMAIL,)
    try {
      const mailOptions = {
        from: process.env.GODADY_EMAIL,
        to,
        subject,
        text,
        html
      };
      //console.log('email from',from);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendTemplate({ to, template, data }) {
    const templates = {
      welcome: {
        subject: 'Welcome to Our Service',
        text: `Hello ${data.name},\n\nWelcome to our service!\n\nBest regards,\nYour Team`,
        html: `<h1>Welcome ${data.name}!</h1><p>We're glad to have you on board.</p>`
      },
      reminder: {
        subject: 'Reminder: Upcoming Event',
        text: `Hello,\n\nReminder about your event: ${data.event} at ${data.time}\n\nBest regards`,
        html: `<h2>Event Reminder</h2><p>Your event: ${data.event}</p><p>Time: ${data.time}</p>`
      }
    };

    const templateData = templates[template];
    if (!templateData) {
      throw new Error('Template not found');
    }

    return this.sendEmail({
      to,
      subject: templateData.subject,
      text: templateData.text,
      html: templateData.html
    });
  }
}

module.exports = new EmailService();