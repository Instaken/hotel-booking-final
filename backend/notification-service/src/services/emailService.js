const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
// For production, use a real SMTP service like SendGrid, Mailgun, or Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    logger.warn('Email transporter verification failed:', error.message);
    logger.warn('Emails will be logged instead of sent');
  } else {
    logger.info('Email transporter is ready');
  }
});

const emailService = {
  sendEmail: async (to, subject, text, html = null) => {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'Hotel Booking <noreply@hotelbooking.com>',
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    };

    try {
      if (process.env.SMTP_USER) {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
      } else {
        // Log email if no SMTP configured
        logger.info('Email would be sent (SMTP not configured):', {
          to,
          subject,
          text: text.substring(0, 100) + '...'
        });
        return { messageId: 'mock-' + Date.now() };
      }
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  },

  sendBookingConfirmation: async (bookingData) => {
    const subject = `Booking Confirmation - ${bookingData.booking_reference}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .label { color: #666; }
          .value { font-weight: bold; }
          .total { font-size: 1.2em; color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Dear ${bookingData.guest_name},</p>
            <p>Your booking has been successfully confirmed. Here are your booking details:</p>
            
            <div class="booking-details">
              <div class="detail-row">
                <span class="label">Booking Reference</span>
                <span class="value">${bookingData.booking_reference}</span>
              </div>
              <div class="detail-row">
                <span class="label">Hotel</span>
                <span class="value">${bookingData.hotel_name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Room</span>
                <span class="value">${bookingData.room_name}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-in</span>
                <span class="value">${new Date(bookingData.check_in).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-out</span>
                <span class="value">${new Date(bookingData.check_out).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="label">Guests</span>
                <span class="value">${bookingData.guests}</span>
              </div>
              <div class="detail-row">
                <span class="label">Total Price</span>
                <span class="value total">€${bookingData.total_price}</span>
              </div>
            </div>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>We look forward to welcoming you!</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing Hotel Booking</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Booking Confirmed!

Dear ${bookingData.guest_name},

Your booking has been successfully confirmed.

Booking Reference: ${bookingData.booking_reference}
Hotel: ${bookingData.hotel_name}
Room: ${bookingData.room_name}
Check-in: ${new Date(bookingData.check_in).toLocaleDateString()}
Check-out: ${new Date(bookingData.check_out).toLocaleDateString()}
Guests: ${bookingData.guests}
Total Price: €${bookingData.total_price}

Thank you for choosing Hotel Booking!
    `.trim();

    return emailService.sendEmail(bookingData.guest_email, subject, text, html);
  },

  sendLowCapacityAlert: async (adminEmail, adminName, rooms) => {
    const subject = 'Low Capacity Alert - Action Required';
    
    const roomsList = rooms.map(r => 
      `<li>${r.hotel_name} / ${r.room_name}: ${r.capacity_percentage}% capacity remaining</li>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .alert-list { background: white; padding: 15px; border-radius: 8px; }
          ul { margin: 0; padding-left: 20px; }
          li { padding: 8px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Capacity Alert</h1>
          </div>
          <div class="content">
            <p>Dear ${adminName},</p>
            <p>The following rooms have less than 20% capacity available for the next month:</p>
            
            <div class="alert-list">
              <ul>${roomsList}</ul>
            </div>
            
            <p>Please consider adjusting availability or taking promotional actions.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Low Capacity Alert

Dear ${adminName},

The following rooms have less than 20% capacity available for the next month:

${rooms.map(r => `- ${r.hotel_name} / ${r.room_name}: ${r.capacity_percentage}% capacity remaining`).join('\n')}

Please consider adjusting availability or taking promotional actions.
    `.trim();

    return emailService.sendEmail(adminEmail, subject, text, html);
  }
};

module.exports = emailService;
