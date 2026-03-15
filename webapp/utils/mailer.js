const nodemailer = require('nodemailer');

// Shared email transporter
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

function getFromAddress() {
    return `"Avensong HOA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
}

function isEmailConfigured() {
    return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Send an email (returns true/false, never throws)
async function sendEmail({ to, subject, html, attachments }) {
    if (!isEmailConfigured()) return false;

    try {
        const transporter = createTransporter();
        await transporter.sendMail({
            from: getFromAddress(),
            to,
            subject,
            html,
            attachments: attachments || []
        });
        return true;
    } catch (err) {
        console.error(`Email send failed to ${to}:`, err.message);
        return false;
    }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function emailHeader() {
    return `
    <tr>
        <td style="background-color: #8b1c1c; padding: 30px 40px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Avensong</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px;">Digital Amenity Access Packet 2026</p>
        </td>
    </tr>`;
}

function emailFooter() {
    return `
    <tr>
        <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
                © 2026 Avensong Community Association, Inc. All rights reserved.
            </p>
        </td>
    </tr>`;
}

function emailWrapper(bodyContent) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        ${emailHeader()}
                        <tr><td style="padding: 40px;">${bodyContent}</td></tr>
                        ${emailFooter()}
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

function detailsCard(rows) {
    const rowsHtml = rows.map(([label, value]) => `
        <tr>
            <td style="padding: 6px 0; font-weight: 600; width: 140px;">${label}</td>
            <td style="padding: 6px 0;">${value || '—'}</td>
        </tr>`).join('');
    return `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #555;">${rowsHtml}</table>
    </div>`;
}

function contactLine() {
    return `<p style="color: #888; font-size: 13px; line-height: 1.5; margin: 20px 0 0; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        If you have any questions, please email <a href="mailto:amenities@avensong.org" style="color: #8b1c1c;">amenities@avensong.org</a>.
    </p>`;
}

// ------------------------------------------------
// 1. TENANT INVITE EMAIL (Homeowner → Tenant)
// ------------------------------------------------
function tenantInviteEmail(homeownerName, propertyAddress, appUrl) {
    return emailWrapper(`
        <h2 style="color: #333; margin: 0 0 20px; font-size: 22px;">You've Been Invited!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hello,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your homeowner, <strong>${homeownerName || 'your landlord'}</strong>, has invited you to complete the 
            <strong>2026 Avensong Amenity Access Packet</strong> for the property at:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #8b1c1c; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; color: #333; font-size: 15px; font-weight: 600;">📍 ${propertyAddress || 'Your Avensong Property'}</p>
        </div>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">As a tenant, you are required to complete the following sections:</p>
        <ul style="color: #555; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 10px 0 25px;">
            <li>Resident Census (tenant section)</li>
            <li>COVID/Infectious Disease Waiver</li>
            <li>Amenity Rules, Use & Agreement</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding: 10px 0 25px;">
                <a href="${appUrl}" style="display: inline-block; background-color: #8b1c1c; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(139,28,28,0.3);">
                    Complete Your Packet →
                </a>
            </td></tr>
        </table>
        ${contactLine()}
    `);
}

// ------------------------------------------------
// 2. SUBMISSION CONFIRMATION (System → Submitter)
// ------------------------------------------------
function submissionConfirmationEmail(homeownerName, propertyAddress, residentType, submittedAt) {
    const typeLabel = (residentType || '—').charAt(0).toUpperCase() + (residentType || '—').slice(1);
    return emailWrapper(`
        <div style="text-align: center; margin-bottom: 25px;">
            <div style="display: inline-block; background: #e8f5e9; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 30px;">✅</div>
        </div>
        <h2 style="color: #1f7a68; margin: 0 0 20px; font-size: 22px; text-align: center;">Submission Confirmed!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Dear <strong>${homeownerName || 'Resident'}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your <strong>2026 Avensong Amenity Access Packet</strong> has been successfully submitted. 
            A signed copy of your packet is attached for your records.
        </p>
        ${detailsCard([
            ['Name:', homeownerName],
            ['Property:', propertyAddress],
            ['Resident Type:', typeLabel],
            ['Submitted:', submittedAt]
        ])}
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Once reviewed and your HOA account is verified, your amenity card will be activated.
        </p>
        ${contactLine()}
    `);
}

// ------------------------------------------------
// 3. ADMIN/HOA NOTIFICATION (System → Admin)
// ------------------------------------------------
function adminNewSubmissionEmail(homeownerName, propertyAddress, residentType, submitterEmail, submittedAt) {
    const typeLabel = (residentType || '—').charAt(0).toUpperCase() + (residentType || '—').slice(1);
    return emailWrapper(`
        <h2 style="color: #8b1c1c; margin: 0 0 20px; font-size: 22px;">📋 New Packet Submission</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            A new <strong>2026 Amenity Access Packet</strong> has been digitally submitted. Details below:
        </p>
        ${detailsCard([
            ['Name:', homeownerName],
            ['Property:', propertyAddress],
            ['Resident Type:', typeLabel],
            ['Email:', submitterEmail],
            ['Submitted:', submittedAt]
        ])}
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            The signed PDF is attached. You can also view all submissions in the 
            <a href="${process.env.APP_URL || ''}/admin.html" style="color: #8b1c1c; font-weight: 600;">Admin Dashboard</a>.
        </p>
    `);
}

// ------------------------------------------------
// 4. HOMEOWNER NOTIFICATION (Tenant submitted)
// ------------------------------------------------
function homeownerTenantSubmittedEmail(homeownerName, tenantName, propertyAddress, submittedAt) {
    return emailWrapper(`
        <h2 style="color: #1f7a68; margin: 0 0 20px; font-size: 22px;">Your Tenant Has Submitted!</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Dear <strong>${homeownerName || 'Homeowner'}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Your tenant, <strong>${tenantName || 'your tenant'}</strong>, has completed and submitted their portion of the 
            <strong>2026 Avensong Amenity Access Packet</strong> for:
        </p>
        <div style="background: #f8fafc; border-left: 4px solid #1f7a68; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; color: #333; font-size: 15px; font-weight: 600;">📍 ${propertyAddress || 'Your Avensong Property'}</p>
        </div>
        ${detailsCard([
            ['Tenant Name:', tenantName],
            ['Property:', propertyAddress],
            ['Submitted:', submittedAt]
        ])}
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Please ensure you have also completed your homeowner portion of the packet if you haven't already.
        </p>
        ${contactLine()}
    `);
}

// ------------------------------------------------
// 5. TENANT INVITE CONFIRMATION (System → Homeowner)
// ------------------------------------------------
function homeownerInviteSentEmail(homeownerName, tenantEmail, propertyAddress) {
    return emailWrapper(`
        <h2 style="color: #333; margin: 0 0 20px; font-size: 22px;">Tenant Invite Sent</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Dear <strong>${homeownerName || 'Homeowner'}</strong>,</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            An invitation to complete the <strong>2026 Amenity Access Packet</strong> has been sent to your tenant at:
        </p>
        ${detailsCard([
            ['Tenant Email:', tenantEmail],
            ['Property:', propertyAddress]
        ])}
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
            You will be notified once your tenant completes and submits their packet. If they don't receive the email, 
            ask them to check their spam folder.
        </p>
        ${contactLine()}
    `);
}

module.exports = {
    sendEmail,
    isEmailConfigured,
    tenantInviteEmail,
    submissionConfirmationEmail,
    adminNewSubmissionEmail,
    homeownerTenantSubmittedEmail,
    homeownerInviteSentEmail
};
