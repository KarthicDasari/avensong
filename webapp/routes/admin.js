const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Function to extract sections based on known headers (case-insensitive, flexible whitespace)
function extractSections(text) {
    const introEndMatch = text.search(/section\s*1[\s:]*amenity\s*access\s*packet\s*checklist/i);
    const waiverMatch = text.search(/covid[\/\s]*infectious\s*disease\s*waiver/i);
    const rulesMatch = text.search(/amenity\s*rules[\s,]*use\s*[&\s]*agreement/i);

    let introduction = "";
    let waiver = "";
    let rules = "";

    if (introEndMatch !== -1) {
        introduction = text.substring(0, introEndMatch).trim();
    } else {
        introduction = text.substring(0, Math.min(text.length, 2000)).trim();
    }

    if (waiverMatch !== -1 && rulesMatch !== -1) {
        waiver = text.substring(waiverMatch, rulesMatch).trim();
    } else if (waiverMatch !== -1) {
        waiver = text.substring(waiverMatch).trim();
    }

    if (rulesMatch !== -1) {
        rules = text.substring(rulesMatch).trim();
    }

    return { introduction, waiver, rules };
}

router.post('/upload-pdf', requireAuth, requireAdmin, upload.single('packet_pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded.' });
        }

        // Parse PDF text
        const pdfData = await pdfParse(req.file.buffer);
        const { introduction, waiver, rules } = extractSections(pdfData.text);

        // Simple HTML formatting for the injected text
        const formattedIntro = `<div class="parsed-content">${introduction.replace(/\n/g, '<br>')}</div>`;
        const formattedWaiver = `<div class="parsed-content">${waiver.replace(/\n/g, '<br>')}</div>`;
        const formattedRules = `<div class="parsed-content">${rules.replace(/\n/g, '<br>')}</div>`;

        // Update each row individually by section_name
        await pool.query(
            `UPDATE Content SET html_content = ? WHERE section_name = 'introduction'`,
            [formattedIntro]
        );
        await pool.query(
            `UPDATE Content SET html_content = ? WHERE section_name = 'waiver'`,
            [formattedWaiver]
        );
        await pool.query(
            `UPDATE Content SET html_content = ? WHERE section_name = 'rules'`,
            [formattedRules]
        );

        res.json({ message: 'PDF parsed and text content updated successfully.' });
    } catch (err) {
        console.error("PDF Upload Error:", err);
        res.status(500).json({ error: 'Failed to process PDF.' });
    }
});

module.exports = router;
