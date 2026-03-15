const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Valid section names — Issue #6 constant validation
const VALID_SECTIONS = ['introduction', 'waiver', 'rules'];

// Get all content for the frontend to render dynamically
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT section_name, html_content FROM Content');

        // Transform array into an object mapping like { introduction: "html...", rules: "html..." }
        const contentMap = {};
        rows.forEach(row => {
            if (VALID_SECTIONS.includes(row.section_name)) {
                contentMap[row.section_name] = row.html_content;
            }
        });

        res.json(contentMap);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch externalized content.' });
    }
});

// Update a specific content section (admin only) — Issue #9
router.put('/:sectionName', requireAuth, requireAdmin, async (req, res) => {
    const { sectionName } = req.params;
    const { htmlContent } = req.body;

    if (!VALID_SECTIONS.includes(sectionName)) {
        return res.status(400).json({ error: `Invalid section name. Must be one of: ${VALID_SECTIONS.join(', ')}` });
    }

    if (!htmlContent) {
        return res.status(400).json({ error: 'htmlContent is required.' });
    }

    try {
        await pool.query(
            'UPDATE Content SET html_content = ? WHERE section_name = ?',
            [htmlContent, sectionName]
        );
        res.json({ message: `Section '${sectionName}' updated successfully.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update content.' });
    }
});

module.exports = router;
