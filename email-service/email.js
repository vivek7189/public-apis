const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GODADY_EMAIL,
        pass: process.env.GODADY_PA
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      socketTimeout: 15000
    });

    this.templates = {
        welcome: {
          subject: 'Welcome to MeetSynk - Your AI-Powered Meeting Scheduler',
          text: (userData) => `
  Dear ${userData.name},
  
  Welcome to MeetSynk! You've just unlocked a smarter way to schedule meetings.
  
  Key Features:
  - AI-Powered Scheduling: Intelligent time suggestions based on your preferences
  - WhatsApp Reminders: Never miss a meeting with instant notifications
  - Trusted by 10,000+ professionals worldwide
  - Bank-grade encryption for your data security
  - Smart conflict resolution
  - Multi-timezone support
  
  Start scheduling your first meeting now!
  
  Best regards,
  The MeetSynk Team
          `,
          html: (userData) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f7fa;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to MeetSynk</h1>
        <p style="color: #E0E7FF; margin-top: 10px; font-size: 16px;">Your AI-Powered Meeting Assistant</p>
      </div>
  
      <!-- Main Content -->
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; color: #4B5563;">Dear ${userData.name},</p>
        
        <p style="font-size: 16px; color: #4B5563; margin-bottom: 24px;">
          You've just unlocked a smarter way to schedule meetings. Here's what makes MeetSynk special:
        </p>
  
        <!-- Feature Grid -->
        <div style="display: grid; gap: 20px; margin-bottom: 32px;">
          <!-- AI Scheduling -->
          <div style="padding: 16px; background-color: #F3F4F6; border-radius: 8px; border-left: 4px solid #4F46E5;">
            <h3 style="color: #1F2937; margin: 0 0 8px 0;">🤖 AI-Powered Scheduling</h3>
            <p style="color: #6B7280; margin: 0;">Smart scheduling that learns your preferences and suggests optimal meeting times.</p>
          </div>
  
          <!-- WhatsApp Integration -->
          <div style="padding: 16px; background-color: #F3F4F6; border-radius: 8px; border-left: 4px solid #10B981;">
            <h3 style="color: #1F2937; margin: 0 0 8px 0;">📱 WhatsApp Reminders</h3>
            <p style="color: #6B7280; margin: 0;">Get instant notifications and meeting updates right on WhatsApp.</p>
          </div>
  
          <!-- Trust & Security -->
          <div style="padding: 16px; background-color: #F3F4F6; border-radius: 8px; border-left: 4px solid #F59E0B;">
            <h3 style="color: #1F2937; margin: 0 0 8px 0;">🛡️ Enterprise-Grade Security</h3>
            <p style="color: #6B7280; margin: 0;">Bank-level encryption and trusted by 10,000+ professionals worldwide.</p>
          </div>
        </div>
  
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://www.meetsynk.com" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Schedule Your First Meeting</a>
        </div>
  
        <!-- Stats -->
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin-bottom: 32px;">
          <div style="text-align: center; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div>
              <h4 style="color: #4F46E5; margin: 0; font-size: 24px;">10K+</h4>
              <p style="color: #6B7280; margin: 4px 0 0 0; font-size: 14px;">Active Users</p>
            </div>
            <div>
              <h4 style="color: #4F46E5; margin: 0; font-size: 24px;">99.9%</h4>
              <p style="color: #6B7280; margin: 4px 0 0 0; font-size: 14px;">Uptime</p>
            </div>
            <div>
              <h4 style="color: #4F46E5; margin: 0; font-size: 24px;">50+</h4>
              <p style="color: #6B7280; margin: 4px 0 0 0; font-size: 14px;">Integrations</p>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Footer -->
      <div style="background-color: #F3F4F6; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin: 0; font-size: 14px;">© 2024 MeetSynk. All rights reserved.</p>
        <div style="margin-top: 16px;">
          <a href="#" style="color: #4F46E5; text-decoration: none; margin: 0 8px; font-size: 14px;">Help Center</a>
          <a href="#" style="color: #4F46E5; text-decoration: none; margin: 0 8px; font-size: 14px;">Privacy Policy</a>
          <a href="#" style="color: #4F46E5; text-decoration: none; margin: 0 8px; font-size: 14px;">Terms of Service</a>
        </div>
      </div>
    </div>
  </body>
  </html>
          `
        }
      };
    }

  async sendEmail({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: process.env.GODADY_EMAIL,
        to,
        subject,
        text,
        html
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(userData) {
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required for welcome email');
    }

    const template = this.templates.welcome;
    return this.sendEmail({
      to: userData.email,
      subject: template.subject,
      text: template.text(userData),
      html: template.html(userData)
    });
  }
}

module.exports = new EmailService();