const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');
const router = express.Router();

// Configure email transporter
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

// Build the tenant invite email HTML
function buildInviteEmail(homeownerName, propertyAddress, appUrl) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #8b1c1c; padding: 30px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Avensong</h1>
                                <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Digital Amenity Access Packet 2026</p>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #333; margin: 0 0 20px; font-size: 22px;">You've Been Invited!</h2>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                                    Hello,
                                </p>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                                    Your homeowner, <strong>${homeownerName || 'your landlord'}</strong>, has invited you to complete the 
                                    <strong>2026 Avensong Amenity Access Packet</strong> for the property at:
                                </p>
                                <div style="background: #f8fafc; border-left: 4px solid #8b1c1c; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                                    <p style="margin: 0; color: #333; font-size: 15px; font-weight: 600;">
                                        📍 ${propertyAddress || 'Your Avensong Property'}
                                    </p>
                                </div>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 15px 0;">
                                    As a tenant, you are required to complete the following sections of the amenity access packet:
                                </p>
                                <ul style="color: #555; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 10px 0 25px;">
                                    <li>Resident Census (tenant section)</li>
                                    <li>COVID/Infectious Disease Waiver</li>
                                    <li>Amenity Rules, Use & Agreement</li>
                                </ul>
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 10px 0 25px;">
                                            <a href="${appUrl}" 
                                               style="display: inline-block; background-color: #8b1c1c; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(139,28,28,0.3);">
                                                Complete Your Packet →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    Please complete this as soon as possible to ensure your amenity card is activated on time. 
                                    If you have questions, email <a href="mailto:amenities@avensong.org" style="color: #8b1c1c;">amenities@avensong.org</a>.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #999; font-size: 12px; margin: 0;">
                                    © 2026 Avensong Community Association, Inc. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

// Store a tenant invite and send email
router.post('/', async (req, res) => {
    const { tenantEmail, propertyAddress, homeownerName } = req.body;

    if (!tenantEmail) {
        return res.status(400).json({ error: 'Tenant email is required.' });
    }

    try {
        // Create the TenantInvites table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS TenantInvites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_email VARCHAR(255) NOT NULL,
                property_address VARCHAR(200),
                homeowner_name VARCHAR(150),
                status ENUM('pending', 'completed') DEFAULT 'pending',
                email_sent BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Store the invite
        await pool.query(
            `INSERT INTO TenantInvites (tenant_email, property_address, homeowner_name) VALUES (?, ?, ?)`,
            [tenantEmail, propertyAddress || '', homeownerName || '']
        );

        // Try to send the email
        let emailSent = false;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = createTransporter();
                const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

                await transporter.sendMail({
                    from: `"Avensong HOA" <${process.env.SMTP_USER}>`,
                    to: tenantEmail,
                    subject: '2026 Avensong Amenity Access Packet — Tenant Invitation',
                    html: buildInviteEmail(homeownerName, propertyAddress, appUrl)
                });

                emailSent = true;

                // Update the record to reflect email was sent
                await pool.query(
                    `UPDATE TenantInvites SET email_sent = TRUE WHERE tenant_email = ? ORDER BY created_at DESC LIMIT 1`,
                    [tenantEmail]
                );
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr.message);
                // Don't fail the whole request — invite is still stored
            }
        }

        const message = emailSent
            ? `Invitation email successfully sent to ${tenantEmail}!`
            : `Tenant invite recorded for ${tenantEmail}. Email could not be sent — please configure SMTP_USER and SMTP_PASS in your environment variables.`;

        res.status(201).json({ message, emailSent });
    } catch (err) {
        console.error('Tenant Invite Error:', err);
        res.status(500).json({ error: 'Failed to record tenant invite.' });
    }
});

module.exports = router;
