const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRole } = require('../middleware/auth');
const {
    createResidentTicket,
    getResidentTickets,
    getCommonIssues,
    rateTicket,
    getCategories
} = require('../controllers/ticketController');

router.use(verifyToken, authorizeRole(['Resident']));

router.get('/tickets', getResidentTickets);
router.post('/tickets', createResidentTicket);
router.post('/tickets/:id/rate', rateTicket);
router.get('/common-issues', getCommonIssues);
router.get('/categories', getCategories);

module.exports = router;
