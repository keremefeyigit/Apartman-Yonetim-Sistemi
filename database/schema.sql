1-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('Admin', 'Staff', 'Resident')) NOT NULL,
    is_active INTEGER DEFAULT 1
);

-- Blocks Table
CREATE TABLE IF NOT EXISTS Blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_name TEXT NOT NULL,
    total_floors INTEGER NOT NULL
);

-- Apartments Table
CREATE TABLE IF NOT EXISTS Apartments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id INTEGER,
    floor_number INTEGER NOT NULL,
    door_number TEXT NOT NULL,
    type TEXT,
    FOREIGN KEY (block_id) REFERENCES Blocks(id)
);

-- Occupancy Table
CREATE TABLE IF NOT EXISTS Occupancy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    apartment_id INTEGER,
    type TEXT CHECK(type IN ('Owner', 'Tenant')) NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (apartment_id) REFERENCES Apartments(id)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sla_hours INTEGER DEFAULT 24
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS Tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    apartment_id INTEGER,
    category_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Low',
    status TEXT CHECK(status IN ('Open', 'Assigned', 'In_Progress', 'Pending', 'Resolved', 'Closed')) DEFAULT 'Open',
    assigned_user_id INTEGER,
    attachment_urls TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    satisfaction_score INTEGER CHECK(satisfaction_score BETWEEN 1 AND 5),
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (apartment_id) REFERENCES Apartments(id),
    FOREIGN KEY (category_id) REFERENCES Categories(id),
    FOREIGN KEY (assigned_user_id) REFERENCES Users(id)
);

-- Ticket Actions Table
CREATE TABLE IF NOT EXISTS Ticket_Actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action_type TEXT CHECK(action_type IN ('StatusChange', 'Comment', 'Assignment')) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Initial Data Seeding (Optional but helpful)
INSERT OR IGNORE INTO Categories (name, sla_hours) VALUES ('Plumbing', 24), ('Electrical', 12), ('Cleaning', 48), ('Security', 4), ('General', 72);
INSERT OR IGNORE INTO Blocks (block_name, total_floors) VALUES ('A Block', 10), ('B Block', 10);
