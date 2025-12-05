const db = require('../database/db');

const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) {
            reject(err);
        } else {
            resolve(this);
        }
    });
});

const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) {
            reject(err);
        } else {
            resolve(row);
        }
    });
});

const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) {
            reject(err);
        } else {
            resolve(rows);
        }
    });
});

const parseJsonSafely = (value) => {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const mapTicketRow = (row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    category_id: row.category_id,
    category_name: row.category_name,
    created_at: row.created_at,
    closed_at: row.closed_at,
    satisfaction_score: row.satisfaction_score,
    user_id: row.user_id,
    requester_name: row.requester_name,
    assigned_user_id: row.assigned_user_id,
    assigned_full_name: row.assigned_full_name,
    block_name: row.block_name,
    door_number: row.door_number,
    attachments: parseJsonSafely(row.attachment_urls)
});

const logTicketAction = (ticketId, userId, actionType, description) =>
    runAsync(
        'INSERT INTO Ticket_Actions (ticket_id, user_id, action_type, description) VALUES (?, ?, ?, ?)',
        [ticketId, userId, actionType, description]
    ).catch(() => {});

async function createResidentTicket(req, res) {
    const { category_id, title, description, priority = 'Low', attachments = [] } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category_id) {
        return res.status(400).json({ error: 'Kategori, başlık ve açıklama zorunludur.' });
    }

    try {
        const occupancy = await getAsync(
            'SELECT apartment_id FROM Occupancy WHERE user_id = ? ORDER BY start_date DESC LIMIT 1',
            [userId]
        );

        if (!occupancy) {
            return res.status(400).json({ error: 'Daire bilgisi bulunamadı. Yöneticiye başvurun.' });
        }

        const insertResult = await runAsync(
            `INSERT INTO Tickets (user_id, apartment_id, category_id, title, description, priority, attachment_urls)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                occupancy.apartment_id,
                category_id,
                title.trim(),
                description.trim(),
                priority,
                JSON.stringify(Array.isArray(attachments) ? attachments : [])
            ]
        );

        await logTicketAction(insertResult.lastID, userId, 'Comment', 'Talep oluşturuldu.');

        res.status(201).json({
            message: 'Talebiniz alınmıştır.',
            ticketId: insertResult.lastID
        });
    } catch (error) {
        res.status(500).json({ error: 'Talep oluşturma sırasında hata: ' + error.message });
    }
}

async function getResidentTickets(req, res) {
    try {
        const tickets = await allAsync(
            `SELECT Tickets.*, Categories.name AS category_name,
                    Blocks.block_name, Apartments.door_number,
                    Assigned.full_name AS assigned_full_name
             FROM Tickets
             LEFT JOIN Categories ON Tickets.category_id = Categories.id
             LEFT JOIN Apartments ON Tickets.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             LEFT JOIN Users AS Assigned ON Tickets.assigned_user_id = Assigned.id
             WHERE Tickets.user_id = ?
             ORDER BY Tickets.created_at DESC`,
            [req.user.id]
        );

        res.json({ tickets: tickets.map(mapTicketRow) });
    } catch (error) {
        res.status(500).json({ error: 'Talepler getirilemedi: ' + error.message });
    }
}

async function getCommonIssues(req, res) {
    try {
        const occupancy = await getAsync(
            'SELECT apartment_id FROM Occupancy WHERE user_id = ? ORDER BY start_date DESC LIMIT 1',
            [req.user.id]
        );

        const apartmentId = occupancy ? occupancy.apartment_id : null;

        const params = [req.user.id];
        let whereClause = `WHERE Tickets.status IN ('Open', 'Assigned', 'In_Progress')
               AND Tickets.user_id != ?`;

        if (apartmentId) {
            whereClause += ' AND (Tickets.apartment_id IS NULL OR Tickets.apartment_id != ?)';
            params.push(apartmentId);
        }

        const tickets = await allAsync(
            `SELECT Tickets.id, Tickets.title, Tickets.status, Tickets.priority, Tickets.created_at,
                    Blocks.block_name, Apartments.door_number, Categories.name AS category_name
             FROM Tickets
             LEFT JOIN Apartments ON Tickets.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             LEFT JOIN Categories ON Tickets.category_id = Categories.id
             ${whereClause}
             ORDER BY Tickets.created_at DESC
             LIMIT 6`,
            params
        );

        res.json({ issues: tickets });
    } catch (error) {
        res.status(500).json({ error: 'Genel sorunlar alınamadı: ' + error.message });
    }
}

async function rateTicket(req, res) {
    const { id } = req.params;
    const { score } = req.body;
    const numericScore = Number(score);

    if (!numericScore || numericScore < 1 || numericScore > 5) {
        return res.status(400).json({ error: 'Puan 1 ile 5 arasında olmalıdır.' });
    }

    try {
        const ticket = await getAsync('SELECT * FROM Tickets WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (!ticket) {
            return res.status(404).json({ error: 'Talep bulunamadı.' });
        }

        if (!['Resolved', 'Closed'].includes(ticket.status)) {
            return res.status(400).json({ error: 'Sadece çözülen talepler değerlendirilebilir.' });
        }

        await runAsync(
            `UPDATE Tickets
             SET satisfaction_score = ?, status = 'Closed', closed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [numericScore, id]
        );

        await logTicketAction(id, req.user.id, 'Comment', `Memnuniyet puanı: ${numericScore}`);

        res.json({ message: 'Geri bildiriminiz için teşekkürler.' });
    } catch (error) {
        res.status(500).json({ error: 'Geri bildirim kaydedilemedi: ' + error.message });
    }
}

async function getAllTickets(req, res) {
    const { status } = req.query;
    const params = [];
    let whereClause = '';

    if (status) {
        whereClause = 'WHERE Tickets.status = ?';
        params.push(status);
    }

    try {
        const rows = await allAsync(
            `SELECT Tickets.*, Categories.name AS category_name, Requester.full_name AS requester_name,
                    Blocks.block_name, Apartments.door_number,
                    Assigned.full_name AS assigned_full_name
             FROM Tickets
             LEFT JOIN Categories ON Tickets.category_id = Categories.id
             LEFT JOIN Users AS Requester ON Tickets.user_id = Requester.id
             LEFT JOIN Users AS Assigned ON Tickets.assigned_user_id = Assigned.id
             LEFT JOIN Apartments ON Tickets.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             ${whereClause}
             ORDER BY Tickets.created_at DESC`,
            params
        );

        res.json({ tickets: rows.map(mapTicketRow) });
    } catch (error) {
        res.status(500).json({ error: 'Talepler yüklenemedi: ' + error.message });
    }
}

async function getDashboardMetrics(req, res) {
    try {
        const openCounts = await getAsync(
            `SELECT COUNT(*) AS count FROM Tickets WHERE status IN ('Open', 'Assigned', 'In_Progress', 'Pending')`
        );

        const criticalCounts = await getAsync(
            `SELECT COUNT(*) AS count FROM Tickets WHERE priority = 'Critical' AND status IN ('Open', 'Assigned', 'In_Progress')`
        );

        const avgResolution = await getAsync(
            `SELECT AVG((JULIANDAY(COALESCE(closed_at, CURRENT_TIMESTAMP)) - JULIANDAY(created_at)) * 24) AS avg_hours
             FROM Tickets
             WHERE closed_at IS NOT NULL`
        );

        const lastSevenDays = await getAsync(
            `SELECT COUNT(*) AS count FROM Tickets WHERE created_at >= datetime('now', '-7 day')`
        );

        const categoryDistribution = await allAsync(
            `SELECT Categories.name AS category_name, COUNT(Tickets.id) AS count
             FROM Tickets
             LEFT JOIN Categories ON Tickets.category_id = Categories.id
             GROUP BY Categories.name`
        );

        const blockHeatmap = await allAsync(
            `SELECT Blocks.block_name, COUNT(Tickets.id) AS count
             FROM Tickets
             LEFT JOIN Apartments ON Tickets.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             GROUP BY Blocks.block_name`
        );

        const staffPerformance = await allAsync(
            `SELECT Users.full_name AS staff_name,
                    AVG((JULIANDAY(COALESCE(Tickets.closed_at, CURRENT_TIMESTAMP)) - JULIANDAY(Tickets.created_at)) * 24) AS avg_hours,
                    COUNT(Tickets.id) AS total
             FROM Tickets
             LEFT JOIN Users ON Tickets.assigned_user_id = Users.id
             WHERE Users.role = 'Staff' AND Tickets.assigned_user_id IS NOT NULL
             GROUP BY Users.full_name`
        );

        const avgHours = avgResolution && avgResolution.avg_hours != null
            ? Number(avgResolution.avg_hours)
            : 0;

        res.json({
            kpis: {
                openTickets: openCounts ? openCounts.count : 0,
                avgResolutionHours: Number(avgHours.toFixed(1)),
                lastSevenDays: lastSevenDays ? lastSevenDays.count : 0,
                criticalTickets: criticalCounts ? criticalCounts.count : 0
            },
            categoryDistribution,
            blockHeatmap,
            staffPerformance
        });
    } catch (error) {
        res.status(500).json({ error: 'Dashboard verileri alınamadı: ' + error.message });
    }
}

async function assignTicket(req, res) {
    const { ticketId } = req.params;
    const { staff_id, note } = req.body;

    try {
        const staff = await getAsync('SELECT id, role FROM Users WHERE id = ?', [staff_id]);
        if (!staff || staff.role !== 'Staff') {
            return res.status(400).json({ error: 'Geçerli bir personel seçiniz.' });
        }

        const ticket = await getAsync('SELECT id FROM Tickets WHERE id = ?', [ticketId]);
        if (!ticket) {
            return res.status(404).json({ error: 'Talep bulunamadı.' });
        }

        await runAsync(
            `UPDATE Tickets
             SET assigned_user_id = ?, status = 'Assigned'
             WHERE id = ?`,
            [staff_id, ticketId]
        );

        await logTicketAction(ticketId, req.user.id, 'Assignment', note ? note : 'Talep personele atandı.');

        res.json({ message: 'Talep personele atandı.' });
    } catch (error) {
        res.status(500).json({ error: 'Atama yapılamadı: ' + error.message });
    }
}

async function adminUpdateTicketStatus(req, res) {
    const { ticketId } = req.params;
    const { status, note } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Durum bilgisi gerekli.' });
    }

    const allowedStatuses = ['Open', 'Assigned', 'In_Progress', 'Pending', 'Resolved', 'Closed'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Geçersiz durum.' });
    }

    try {
        const ticket = await getAsync('SELECT id FROM Tickets WHERE id = ?', [ticketId]);
        if (!ticket) {
            return res.status(404).json({ error: 'Talep bulunamadı.' });
        }

        const closeFields = ['Resolved', 'Closed'].includes(status) ? ', closed_at = CURRENT_TIMESTAMP' : '';

        await runAsync(
            `UPDATE Tickets SET status = ? ${closeFields} WHERE id = ?`,
            [status, ticketId]
        );

        await logTicketAction(ticketId, req.user.id, 'StatusChange', note ? note : `Durum ${status} olarak güncellendi.`);

        res.json({ message: 'Talep durumu güncellendi.' });
    } catch (error) {
        res.status(500).json({ error: 'Durum güncellenemedi: ' + error.message });
    }
}

async function getCategories(req, res) {
    try {
        const categories = await allAsync('SELECT * FROM Categories ORDER BY name ASC');
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ error: 'Kategoriler alınamadı: ' + error.message });
    }
}

async function createCategory(req, res) {
    const { name, sla_hours = 24 } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Kategori adı zorunludur.' });
    }

    try {
        const result = await runAsync(
            'INSERT INTO Categories (name, sla_hours) VALUES (?, ?)',
            [name.trim(), sla_hours]
        );
        res.status(201).json({ message: 'Kategori oluşturuldu.', categoryId: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Kategori eklenemedi: ' + error.message });
    }
}

async function getStaffTickets(req, res) {
    try {
        const tickets = await allAsync(
            `SELECT Tickets.*, Categories.name AS category_name,
                    Blocks.block_name, Apartments.door_number
             FROM Tickets
             LEFT JOIN Categories ON Tickets.category_id = Categories.id
             LEFT JOIN Apartments ON Tickets.apartment_id = Apartments.id
             LEFT JOIN Blocks ON Apartments.block_id = Blocks.id
             WHERE Tickets.assigned_user_id = ? AND Tickets.status IN ('Assigned', 'In_Progress')
             ORDER BY Tickets.priority DESC, Tickets.created_at ASC`,
            [req.user.id]
        );

        res.json({ tickets: tickets.map(mapTicketRow) });
    } catch (error) {
        res.status(500).json({ error: 'Görevler getirilemedi: ' + error.message });
    }
}

async function staffUpdateStatus(req, res) {
    const { ticketId } = req.params;
    const { status, note } = req.body;

    const allowed = ['In_Progress', 'Pending', 'Resolved'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Bu işlem için geçersiz durum.' });
    }

    try {
        const ticket = await getAsync(
            'SELECT id FROM Tickets WHERE id = ? AND assigned_user_id = ?',
            [ticketId, req.user.id]
        );

        if (!ticket) {
            return res.status(404).json({ error: 'Talep bulunamadı.' });
        }

        const closeFields = status === 'Resolved' ? ', closed_at = CURRENT_TIMESTAMP' : '';

        await runAsync(
            `UPDATE Tickets SET status = ? ${closeFields} WHERE id = ?`,
            [status, ticketId]
        );

        await logTicketAction(ticketId, req.user.id, 'StatusChange', note ? note : `Durum ${status} olarak güncellendi.`);

        res.json({ message: 'Durum güncellendi.' });
    } catch (error) {
        res.status(500).json({ error: 'Durum güncellenemedi: ' + error.message });
    }
}

module.exports = {
    createResidentTicket,
    getResidentTickets,
    getCommonIssues,
    rateTicket,
    getAllTickets,
    getDashboardMetrics,
    assignTicket,
    adminUpdateTicketStatus,
    getCategories,
    createCategory,
    getStaffTickets,
    staffUpdateStatus
};
