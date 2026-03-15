const express = require('express');
const pool = require('../db');
const { sendEmail, tenantInviteEmail, homeownerInviteSentEmail } = require('../utils/mailer');
const router = express.Router();

// Store a tenant invite and send emails
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

        const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

        // EMAIL 1: Send invite to tenant
        const inviteSent = await sendEmail({
            to: tenantEmail,
            subject: '2026 Avensong Amenity Access Packet — Tenant Invitation',
            html: tenantInviteEmail(homeownerName, propertyAddress, appUrl)
        });

        if (inviteSent) {
            await pool.query(
                `UPDATE TenantInvites SET email_sent = TRUE WHERE tenant_email = ? ORDER BY created_at DESC LIMIT 1`,
                [tenantEmail]
            );
        }

        // EMAIL 2: Confirm to homeowner that the invite was sent
        // Use the homeowner's email from the form (passed as part of the request context)
        const homeownerEmail = req.body.homeownerEmail;
        if (homeownerEmail && inviteSent) {
            await sendEmail({
                to: homeownerEmail,
                subject: 'Tenant Invite Sent — Avensong Amenity Packet',
                html: homeownerInviteSentEmail(homeownerName, tenantEmail, propertyAddress)
            });
        }

        const message = inviteSent
            ? `Invitation email successfully sent to ${tenantEmail}!`
            : `Tenant invite recorded for ${tenantEmail}. Email could not be sent — please check SMTP configuration.`;

        res.status(201).json({ message, emailSent: inviteSent });
    } catch (err) {
        console.error('Tenant Invite Error:', err);
        res.status(500).json({ error: 'Failed to record tenant invite.' });
    }
});

module.exports = router;
