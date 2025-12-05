const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/auth');
const { getStaffTickets, staffUpdateStatus, getCategories } = require('../controllers/ticketController');

router.use(verifyToken, authorizeRole(['Staff']));

router.get('/tickets', getStaffTickets);
router.put('/tickets/:ticketId/status', staffUpdateStatus);
router.get('/categories', getCategories);

module.exports = router;
