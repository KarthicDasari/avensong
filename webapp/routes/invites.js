const express = require('express');
const pool = require('../db');
const router = express.Router();

// Store a tenant invite
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(
            `INSERT INTO TenantInvites (tenant_email, property_address, homeowner_name) VALUES (?, ?, ?)`,
            [tenantEmail, propertyAddress || '', homeownerName || '']
        );

        res.status(201).json({ 
            message: `Tenant invite recorded for ${tenantEmail}. Note: Actual email delivery requires email service configuration (future enhancement).` 
        });
    } catch (err) {
        console.error('Tenant Invite Error:', err);
        res.status(500).json({ error: 'Failed to record tenant invite.' });
    }
});

module.exports = router;
