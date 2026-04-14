'use strict';

const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com', // your Gmail account
        pass: 'your_email_password' // your Gmail password or app password
    }
});

// Function to send license key email
async function sendLicenseKeyEmail(recipientEmail, licenseKey) {
    const mailOptions = {
        from: 'your_email@gmail.com', // sender address
        to: recipientEmail, // list of receivers
        subject: 'Your License Key', // Subject line
        text: `Thank you for your purchase! Your license key is: ${licenseKey}`, // plain text body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email: ', error);
    }
}

module.exports = sendLicenseKeyEmail;
