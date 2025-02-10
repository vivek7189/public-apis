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

    this.getMeetingIcon = (meetingType) => {
      switch(meetingType?.toLowerCase()) {
        case 'google meet':
          return '🎥';
        case 'zoom':
          return '📹';
        case 'teams':
          return '👥';
        default:
          return '🔗';
      }
    };

    this.templates = {
      meetingInvite: {
        getSubject: (isReschedule, eventTitle) => 
          isReschedule 
            ? `Meeting Rescheduled: ${eventTitle || 'Updated Meeting'}`
            : `Meeting Confirmation: ${eventTitle || 'New Meeting'}`,

        text: (meetingData) => `
Dear ${meetingData.name},

${meetingData.isReschedule 
  ? 'Your meeting has been rescheduled to the following time:'
  : 'Your meeting has been scheduled successfully.'}

Meeting Details:
- Date: ${meetingData?.meetingDateTime.format('LL')}
- Time: ${meetingData?.meetingDateTime.format('LT')} ${meetingData?.timeZone}
- Time Zone: ${meetingData?.timeZone}
- Meeting Type: ${meetingData?.meetingType || 'Online Meeting'}
- Meeting Link: ${meetingData?.meetingLink || '--'}
- Notes: ${meetingData?.notes || 'No additional notes'}

Manage your meeting:
Reschedule: https://www.meetsynk.com/${meetingData?.eventSlug}?rescheduleId=${meetingData?.eventId}
Cancel: https://www.meetsynk.com/${meetingData?.eventSlug}?rescheduleId=${meetingData?.eventId}

${meetingData.isReschedule 
  ? 'The previous meeting has been canceled. You will receive a new calendar invitation shortly.'
  : 'The meeting has been added to your calendar. You will receive a calendar invitation separately.'}

Best regards,
The MeetSynk Team`,

        html: (meetingData) => `
<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f7fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
        ${meetingData.isReschedule ? 'Meeting Rescheduled' : 'Meeting Confirmation'}
      </h1>
      <p style="color: #E0E7FF; margin-top: 10px; font-size: 16px;">
        ${meetingData.isReschedule 
          ? 'Your meeting has been rescheduled to a new time'
          : 'Your meeting is scheduled!'}
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; color: #4B5563;">Dear ${meetingData?.name},</p>
      
      <p style="font-size: 16px; color: #4B5563;">
        ${meetingData.isReschedule 
          ? 'Your meeting has been rescheduled to the following time:'
          : 'Your meeting has been scheduled successfully.'}
      </p>

      <div style="background-color: #F3F4F6; padding: 24px; border-radius: 8px; margin: 24px 0;">
        <h3 style="color: #1F2937; margin: 0 0 16px 0;">
          ${meetingData.isReschedule ? 'Updated Meeting Details' : 'Meeting Details'} 
          ${meetingData.getMeetingIcon?.(meetingData?.meetingType)}
        </h3>
        
        <div style="margin-bottom: 12px;">
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Date:</strong></p>
          <p style="color: #6B7280; margin: 0;">${meetingData?.meetingDateTime.format('LL')}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Time:</strong></p>
          <p style="color: #6B7280; margin: 0;">${meetingData?.meetingDateTime.format('LT')} ${meetingData?.timeZone}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Time Zone:</strong></p>
          <p style="color: #6B7280; margin: 0;">${meetingData?.timeZone}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Meeting Type:</strong></p>
          <p style="color: #6B7280; margin: 0;">${meetingData?.meetingType || 'Online Meeting'}</p>
        </div>
        
        <div style="margin-bottom: 12px;">
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Meeting Link:</strong></p>
          <p style="color: #6B7280; margin: 0;">
            <a href="${meetingData?.meetingLink}" style="color: #4F46E5; text-decoration: none;">${meetingData?.meetingLink || '--'}</a>
          </p>
        </div>
        
        ${meetingData?.notes ? `
        <div>
          <p style="color: #4B5563; margin: 0 0 4px 0;"><strong>Notes:</strong></p>
          <p style="color: #6B7280; margin: 0;">${meetingData.notes}</p>
        </div>
        ` : ''}
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.meetsynk.com/${meetingData?.eventSlug}?rescheduleId=${meetingData?.eventId}" 
           style="display: inline-block; background: #4F46E5; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 8px;">
          Reschedule Meeting
        </a>
        <a href="https://www.meetsynk.com/${meetingData?.eventSlug}?rescheduleId=${meetingData?.eventId}" 
           style="display: inline-block; background: #DC2626; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 8px;">
          Cancel Meeting
        </a>
      </div>

      <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 16px;">
        ${meetingData.isReschedule 
          ? 'The previous meeting has been canceled. You will receive a new calendar invitation shortly.'
          : 'The meeting has been added to your calendar. You will receive a calendar invitation separately.'}
      </p>
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
</html>`
      },

      welcome: {
        subject: 'Welcome to MeetSynk - Your AI-Powered Meeting Scheduler',
        text: (userData) => `
Dear ${userData.name},

Welcome to MeetSynk! You've just unlocked a smarter way to schedule meetings.

Key Features:
- AI-Powered Scheduling: Intelligent time suggestions based on your preferences
- WhatsApp Reminders: Never miss a meeting with instant notifications
- Trusted by professionals worldwide
- Bank-grade encryption for your data security
- Smart conflict resolution
- Multi-timezone support

Start scheduling your first meeting now!

Best regards,
The MeetSynk Team`,

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
      <p style="font-size: 16px; color: #4B5563;">Dear ${userData?.name},</p>
      
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

        <!-- Custom Page -->
        <div style="padding: 16px; background-color: #F3F4F6; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <h3 style="color: #1F2937; margin: 0 0 8px 0;">🛡️ Create custom page</h3>
          <p style="color: #6B7280; margin: 0;">Design a more detailed and branded custom page.</p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://www.meetsynk.com" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Schedule Your First Meeting</a>
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
</html>`
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

  async sendMeetingInviteEmail(meetingData) {
    console.log('meetingData',meetingData);
    if (!meetingData.email || !meetingData.name || !meetingData.meetingDateTime || !meetingData.timeZone) {
      throw new Error('Required meeting data is missing');
    }

    const template = this.templates.meetingInvite;
    const enhancedMeetingData = {
      ...meetingData,
      isReschedule: !!meetingData.rescheduleId,
      meetingLink: meetingData.meetingLink || meetingData.hangoutLink || '--',
      meetingType: meetingData.meetingType || 'Online Meeting',
      eventSlug: meetingData.eventSlug || 'event',
      eventId: meetingData.eventId || '',
      getMeetingIcon: this.getMeetingIcon
    };

    return this.sendEmail({
      to: meetingData.email,
      subject: template.getSubject(enhancedMeetingData.isReschedule, meetingData.eventTitle),
      text: template.text(enhancedMeetingData),
      html: template.html(enhancedMeetingData)
    });
  }

  // Helper method to format dates if needed
  formatDate(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return date.toString();
    }
  }

  // Helper method to format times if needed
  formatTime(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Time formatting error:', error);
      return date.toString();
    }
  }
}

module.exports = new EmailService();