const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve(__dirname, 'database.sqlite');
const schemaPath = path.resolve(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run('PRAGMA foreign_keys = ON;');
        initDb();
    }
});

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

async function initDb() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, async (err) => {
        if (err) {
            console.error('Error executing schema:', err.message);
            return;
        }

        try {
            await ensureSchemaUpdates();
            await seedDefaultData();
            console.log('Database schema initialized.');
        } catch (error) {
            console.error('Database initialization error:', error.message);
        }
    });
}

async function ensureSchemaUpdates() {
    const ticketColumns = await allAsync('PRAGMA table_info(Tickets)');
    const columnNames = ticketColumns.map((col) => col.name);

    const alterations = [];

    if (!columnNames.includes('assigned_user_id')) {
        alterations.push(runAsync('ALTER TABLE Tickets ADD COLUMN assigned_user_id INTEGER'));
    }

    if (!columnNames.includes('attachment_urls')) {
        alterations.push(runAsync('ALTER TABLE Tickets ADD COLUMN attachment_urls TEXT'));
    }

    await Promise.all(alterations.map((promise) => promise.catch((error) => {
        if (!/duplicate column name/i.test(error.message)) {
            throw error;
        }
    })));
}

async function seedDefaultData() {
    const defaultUsers = [
        {
            full_name: 'Sistem Yöneticisi',
            email: 'admin@siyos.local',
            password: 'Admin123!',
            role: 'Admin'
        },
        {
            full_name: 'Site Personeli',
            email: 'staff@siyos.local',
            password: 'Staff123!',
            role: 'Staff'
        },
        {
            full_name: 'Site Sakini',
            email: 'resident@siyos.local',
            password: 'Resident123!',
            role: 'Resident'
        }
    ];

    const createdUsers = {};

    for (const user of defaultUsers) {
        const existing = await getAsync('SELECT id FROM Users WHERE email = ?', [user.email]);
        if (!existing) {
            const hash = await bcrypt.hash(user.password, 10);
            const result = await runAsync(
                'INSERT INTO Users (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
                [user.full_name, user.email, hash, user.role]
            );
            createdUsers[user.role] = result.lastID;
        } else {
            createdUsers[user.role] = existing.id;
        }
    }

    const block = await getAsync('SELECT id FROM Blocks WHERE block_name = ?', ['A Blok']);
    let blockId = block ? block.id : null;

    if (!blockId) {
        const blockResult = await runAsync(
            'INSERT INTO Blocks (block_name, total_floors) VALUES (?, ?)',
            ['A Blok', 10]
        );
        blockId = blockResult.lastID;
    }

    const apartment = await getAsync(
        'SELECT id FROM Apartments WHERE block_id = ? AND door_number = ?',
        [blockId, 'D1']
    );

    let apartmentId = apartment ? apartment.id : null;

    if (!apartmentId) {
        const apartmentResult = await runAsync(
            'INSERT INTO Apartments (block_id, floor_number, door_number, type) VALUES (?, ?, ?, ?)',
            [blockId, 1, 'D1', '3+1']
        );
        apartmentId = apartmentResult.lastID;
    }

    if (createdUsers.Resident) {
        const residentOccupancy = await getAsync(
            'SELECT id FROM Occupancy WHERE user_id = ?',
            [createdUsers.Resident]
        );

        if (!residentOccupancy) {
            await runAsync(
                'INSERT INTO Occupancy (user_id, apartment_id, type) VALUES (?, ?, ?)',
                [createdUsers.Resident, apartmentId, 'Owner']
            );
        }
    }
}

module.exports = db;
