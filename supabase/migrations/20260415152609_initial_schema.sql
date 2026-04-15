-- Copy and paste this exact script into your Supabase Dashboard -> SQL Editor!

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'coordinator')) NOT NULL,
    fullName TEXT NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    eventDate TEXT NOT NULL,
    description TEXT,
    headerImage TEXT DEFAULT 'header-1.png',
    circularImage TEXT,
    posterImage TEXT,
    registrationImages TEXT DEFAULT '[]',
    eventImages TEXT DEFAULT '[]',
    winnerGroups TEXT DEFAULT '[]',
    customSections TEXT DEFAULT '[]',
    sectionOrder TEXT,
    uploadedWordFile TEXT,
    shareCode TEXT UNIQUE,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
    rejectionNote TEXT,
    createdBy TEXT,
    creatorName TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Note: Because Supabase requires a robust initial user,
-- You will need to insert the hardcoded admins natively or through the API:
-- E.g. INSERT INTO users (id, username, password, role, fullName) VALUES ('admin-id', 'admin', '$2a$10$oY...', 'admin', 'SAHE Admin');
