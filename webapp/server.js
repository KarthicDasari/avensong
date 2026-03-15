const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

require('./db'); // Trigger connection test on startup
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 PDF strings
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);

// Only static routing is needed for this vanilla system

// Start Server
app.listen(PORT, () => {
    console.log(`TiDB-Backed Server running on port ${PORT}`);
});
