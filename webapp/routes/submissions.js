const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Configure email transporter (reuse same config as invites)
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

// Build confirmation email HTML
function buildConfirmationEmail(homeownerName, propertyAddress, residentType, submittedAt) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
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
                                <div style="text-align: center; margin-bottom: 25px;">
                                    <div style="display: inline-block; background: #e8f5e9; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 30px;">✅</div>
                                </div>
                                <h2 style="color: #1f7a68; margin: 0 0 20px; font-size: 22px; text-align: center;">Submission Confirmed!</h2>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 15px;">
                                    Dear <strong>${homeownerName || 'Resident'}</strong>,
                                </p>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                                    Your <strong>2026 Avensong Amenity Access Packet</strong> has been successfully submitted and received by the HOA. 
                                    A signed copy of your packet is attached to this email for your records.
                                </p>
                                <!-- Details Card -->
                                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555;">
                                        <tr>
                                            <td style="padding: 6px 0; font-weight: 600; width: 140px;">Name:</td>
                                            <td style="padding: 6px 0;">${homeownerName || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-weight: 600;">Property:</td>
                                            <td style="padding: 6px 0;">${propertyAddress || '—'}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-weight: 600;">Resident Type:</td>
                                            <td style="padding: 6px 0;">${(residentType || '—').charAt(0).toUpperCase() + (residentType || '—').slice(1)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; font-weight: 600;">Submitted:</td>
                                            <td style="padding: 6px 0;">${submittedAt}</td>
                                        </tr>
                                    </table>
                                </div>
                                <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                                    Once your packet is reviewed and your HOA account is verified to be in good standing, your amenity card will be activated.
                                </p>
                                <p style="color: #888; font-size: 13px; line-height: 1.5; margin: 20px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    If you have any questions, please email <a href="mailto:amenities@avensong.org" style="color: #8b1c1c;">amenities@avensong.org</a>.
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

// Store a new submission (requires auth)
router.post('/', requireAuth, async (req, res) => {
    const { homeownerName, propertyAddress, residentType, pdfBase64, fullData } = req.body;

    try {
        await pool.query(
            `INSERT INTO Submissions (homeowner_name, property_address, resident_type, pdf_path, submission_data) 
             VALUES (?, ?, ?, ?, ?)`,
            [homeownerName, propertyAddress, residentType, "data:application/pdf;base64," + pdfBase64, JSON.stringify(fullData)]
        );

        // Send confirmation email with PDF attachment
        let emailSent = false;
        const submitterEmail = fullData?.email;

        if (process.env.SMTP_USER && process.env.SMTP_PASS && submitterEmail) {
            try {
                const transporter = createTransporter();
                const submittedAt = new Date().toLocaleString('en-US', { 
                    timeZone: 'America/New_York', 
                    dateStyle: 'long', 
                    timeStyle: 'short' 
                });

                await transporter.sendMail({
                    from: `"Avensong HOA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                    to: submitterEmail,
                    subject: '✅ Avensong Amenity Packet — Submission Confirmed',
                    html: buildConfirmationEmail(homeownerName, propertyAddress, residentType, submittedAt),
                    attachments: [
                        {
                            filename: `Avensong_Amenity_Packet_2026_${(homeownerName || 'Resident').replace(/\s+/g, '_')}.pdf`,
                            content: pdfBase64,
                            encoding: 'base64',
                            contentType: 'application/pdf'
                        }
                    ]
                });

                emailSent = true;
            } catch (emailErr) {
                console.error('Confirmation email failed:', emailErr.message);
            }
        }

        const message = emailSent
            ? `Submission recorded! A confirmation email with your signed packet has been sent to ${submitterEmail}.`
            : 'Submission successfully recorded in database.';

        res.status(201).json({ message, emailSent });
    } catch (err) {
        console.error('Submission Error:', err);
        res.status(500).json({ error: 'Failed to save submission.' });
    }
});

// Get all submissions (admin only) — Issue #8
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, homeowner_name, property_address, resident_type, created_at FROM Submissions ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Submissions Error:', err);
        res.status(500).json({ error: 'Failed to fetch submissions.' });
    }
});

module.exports = router;
