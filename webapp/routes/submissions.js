const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendEmail, submissionConfirmationEmail, adminNewSubmissionEmail, homeownerTenantSubmittedEmail } = require('../utils/mailer');
const router = express.Router();

// Store a new submission (requires auth)
router.post('/', requireAuth, async (req, res) => {
    const { homeownerName, propertyAddress, residentType, pdfBase64, fullData } = req.body;

    try {
        await pool.query(
            `INSERT INTO Submissions (homeowner_name, property_address, resident_type, pdf_path, submission_data) 
             VALUES (?, ?, ?, ?, ?)`,
            [homeownerName, propertyAddress, residentType, "data:application/pdf;base64," + pdfBase64, JSON.stringify(fullData)]
        );

        const submittedAt = new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York', 
            dateStyle: 'long', 
            timeStyle: 'short' 
        });

        const pdfAttachment = {
            filename: `Avensong_Amenity_Packet_2026_${(homeownerName || 'Resident').replace(/\s+/g, '_')}.pdf`,
            content: pdfBase64,
            encoding: 'base64',
            contentType: 'application/pdf'
        };

        const submitterEmail = fullData?.email;
        let confirmSent = false;

        // EMAIL 1: Confirmation to submitter with signed PDF
        if (submitterEmail) {
            confirmSent = await sendEmail({
                to: submitterEmail,
                subject: '✅ Avensong Amenity Packet — Submission Confirmed',
                html: submissionConfirmationEmail(homeownerName, propertyAddress, residentType, submittedAt),
                attachments: [pdfAttachment]
            });
        }

        // EMAIL 2: Notify admin/HOA of new submission with PDF
        if (process.env.ADMIN_EMAIL) {
            await sendEmail({
                to: process.env.ADMIN_EMAIL,
                subject: `📋 New Packet Submission — ${homeownerName || 'Resident'}`,
                html: adminNewSubmissionEmail(homeownerName, propertyAddress, residentType, submitterEmail, submittedAt),
                attachments: [pdfAttachment]
            });
        }

        // EMAIL 3: If tenant submitted, notify the homeowner who invited them
        if (residentType === 'tenant' && propertyAddress) {
            try {
                const [invites] = await pool.query(
                    `SELECT homeowner_name, tenant_email FROM TenantInvites 
                     WHERE property_address = ? AND status = 'pending' 
                     ORDER BY created_at DESC LIMIT 1`,
                    [propertyAddress]
                );

                if (invites.length > 0) {
                    // Look up the homeowner's email from the invite or Users table
                    // Try to find homeowner's submission data for their email
                    const [ownerSubs] = await pool.query(
                        `SELECT submission_data FROM Submissions 
                         WHERE property_address = ? AND resident_type = 'homeowner' 
                         ORDER BY created_at DESC LIMIT 1`,
                        [propertyAddress]
                    );

                    let homeownerEmail = null;
                    if (ownerSubs.length > 0) {
                        const ownerData = typeof ownerSubs[0].submission_data === 'string' 
                            ? JSON.parse(ownerSubs[0].submission_data) 
                            : ownerSubs[0].submission_data;
                        homeownerEmail = ownerData?.email;
                    }

                    if (homeownerEmail) {
                        await sendEmail({
                            to: homeownerEmail,
                            subject: `✅ Your Tenant Has Submitted Their Amenity Packet`,
                            html: homeownerTenantSubmittedEmail(
                                invites[0].homeowner_name,
                                homeownerName, // tenant's name
                                propertyAddress,
                                submittedAt
                            )
                        });
                    }

                    // Mark the invite as completed
                    await pool.query(
                        `UPDATE TenantInvites SET status = 'completed' WHERE property_address = ? AND status = 'pending'`,
                        [propertyAddress]
                    );
                }
            } catch (notifyErr) {
                console.error('Homeowner notification failed:', notifyErr.message);
            }
        }

        const message = confirmSent
            ? `Submission recorded! A confirmation email with your signed packet has been sent to ${submitterEmail}.`
            : 'Submission successfully recorded in database.';

        res.status(201).json({ message, emailSent: confirmSent });
    } catch (err) {
        console.error('Submission Error:', err);
        res.status(500).json({ error: 'Failed to save submission.' });
    }
});

// Get all submissions (admin only)
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
