const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
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

        res.status(201).json({ message: 'Submission successfully recorded in database.' });
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
