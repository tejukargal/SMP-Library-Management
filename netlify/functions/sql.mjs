// Netlify Serverless Function — SQL proxy for Nile PostgreSQL
// Replaces the Express /api/sql endpoint for static hosting

import pg from 'pg';

const { Pool } = pg;

// Reuse pool across warm invocations
let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.NILE_DB_URL,
            ssl: { rejectUnauthorized: false },
            max: 3
        });
    }
    return pool;
}

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: null, error: 'Invalid JSON body' })
        };
    }

    const { sql, params = [] } = body;

    if (!sql || typeof sql !== 'string') {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: null, error: 'SQL query is required' })
        };
    }

    const stmt = sql.trim().toUpperCase();
    const allowed = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    if (!allowed.some(op => stmt.startsWith(op))) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: null, error: 'Only SELECT/INSERT/UPDATE/DELETE allowed' })
        };
    }

    try {
        const result = await getPool().query(sql, params);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: result.rows, error: null })
        };
    } catch (error) {
        console.error('SQL Error:', error.message);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: null, error: error.message })
        };
    }
};
