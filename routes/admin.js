const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/auth');
const {
    getDashboardMetrics,
    getAllTickets,
    assignTicket,
    adminUpdateTicketStatus,
    getCategories,
    createCategory
} = require('../controllers/ticketController');
const { listUsers } = require('../controllers/userController');

router.use(verifyToken, authorizeRole(['Admin']));

router.get('/dashboard', getDashboardMetrics);
router.get('/tickets', getAllTickets);
router.post('/tickets/:ticketId/assign', assignTicket);
router.put('/tickets/:ticketId/status', adminUpdateTicketStatus);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/users', listUsers);

module.exports = router;
