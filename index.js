require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
require('./database/db');

const authRoutes = require('./routes/auth');
const residentRoutes = require('./routes/resident');
const adminRoutes = require('./routes/admin');
const staffRoutes = require('./routes/staff');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

// Routes
app.use('/api', authRoutes);
app.use('/api/resident', residentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

// Serve front-end for non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Server Start
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
