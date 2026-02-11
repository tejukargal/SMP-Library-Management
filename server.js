// SMP Library Management System - Backend Server
// Serves static files and proxies SQL queries to Nile PostgreSQL database

import express from 'express';
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Load .env file manually (no dotenv dependency needed)
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (existsSync(envPath)) {
        const lines = readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx > 0) {
                    const key = trimmed.substring(0, eqIdx).trim();
                    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
                    process.env[key] = process.env[key] || val;
                }
            }
        }
    }
}

loadEnv();

const NILE_DB_URL = process.env.NILE_DB_URL;
if (!NILE_DB_URL) {
    console.error('ERROR: NILE_DB_URL environment variable not set.');
    console.error('Create a .env file with: NILE_DB_URL=postgres://user:password@host:5432/dbname');
    process.exit(1);
}

// Nile PostgreSQL connection pool
const pool = new Pool({
    connectionString: NILE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

// Test DB connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to Nile database successfully');
        release();
    }
});

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

// SQL proxy endpoint — called by nile-client.js in the browser
app.post('/api/sql', async (req, res) => {
    const { sql, params = [] } = req.body;

    if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ data: null, error: 'SQL query is required' });
    }

    // Basic SQL injection guard — only allow DML statements
    const stmt = sql.trim().toUpperCase();
    const allowed = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    if (!allowed.some(op => stmt.startsWith(op))) {
        return res.status(400).json({ data: null, error: 'Only SELECT/INSERT/UPDATE/DELETE allowed' });
    }

    try {
        const result = await pool.query(sql, params);
        res.json({ data: result.rows, error: null });
    } catch (error) {
        console.error('SQL Error:', error.message);
        console.error('Query:', sql);
        console.error('Params:', params);
        res.status(400).json({ data: null, error: error.message });
    }
});

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SMP Library Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
