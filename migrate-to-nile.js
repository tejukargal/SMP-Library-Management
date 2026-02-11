// migrate-to-nile.js
// One-time migration script: exports all data from Supabase and imports into Nile DB
// Run: node migrate-to-nile.js

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Load .env file
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

// --- Supabase (source) ---
const configPath = path.join(__dirname, 'config.json');
if (!existsSync(configPath)) {
    console.error('ERROR: config.json not found. It must contain supabaseUrl and supabaseAnonKey.');
    process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

// --- Nile (destination) ---
const NILE_DB_URL = process.env.NILE_DB_URL;
if (!NILE_DB_URL) {
    console.error('ERROR: NILE_DB_URL not set. Add it to your .env file.');
    process.exit(1);
}
const nilePool = new Pool({
    connectionString: NILE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function fetchFromSupabase(table, orderBy = 'created_at') {
    console.log(`  Fetching ${table}...`);
    let allRows = [];
    let from = 0;
    const PAGE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .order(orderBy)
            .range(from, from + PAGE - 1);

        if (error) throw new Error(`Supabase fetch ${table}: ${error.message}`);
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        console.log(`    Fetched ${allRows.length} rows so far...`);

        if (data.length < PAGE) break;
        from += PAGE;
    }

    console.log(`  Total ${table}: ${allRows.length} rows`);
    return allRows;
}

async function batchInsertToNile(client, table, rows, batchSize = 100) {
    if (!rows.length) {
        console.log(`  No rows to insert for ${table}`);
        return;
    }

    const cols = Object.keys(rows[0]);
    let inserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const params = [];
        const valueSets = batch.map(row => {
            const phs = cols.map(col => {
                params.push(row[col] !== undefined ? row[col] : null);
                return `$${params.length}`;
            });
            return `(${phs.join(', ')})`;
        });

        const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES ${valueSets.join(', ')} ON CONFLICT DO NOTHING`;

        try {
            await client.query(sql, params);
            inserted += batch.length;
            process.stdout.write(`\r    Inserted ${inserted}/${rows.length} rows...`);
        } catch (err) {
            console.error(`\n  Batch insert error (rows ${i}-${i + batch.length}):`, err.message);
            // Try row-by-row for this batch to isolate the problem
            for (const row of batch) {
                const rParams = cols.map(col => row[col] !== undefined ? row[col] : null);
                const rPhs = cols.map((_, idx) => `$${idx + 1}`);
                try {
                    await client.query(
                        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${rPhs.join(', ')}) ON CONFLICT DO NOTHING`,
                        rParams
                    );
                    inserted++;
                } catch (rowErr) {
                    console.error(`  Row insert failed:`, JSON.stringify(row).substring(0, 200), rowErr.message);
                }
            }
        }
    }
    console.log(`\n  Done inserting ${table}: ${inserted} rows`);
}

async function migrate() {
    console.log('=== SMP Library: Supabase → Nile Migration ===\n');

    // Test Nile connection
    const client = await nilePool.connect();
    console.log('Connected to Nile database.\n');

    try {
        // 1. Fetch all data from Supabase
        console.log('Step 1: Fetching data from Supabase...');
        const students = await fetchFromSupabase('students', 'name');
        const staff = await fetchFromSupabase('staff', 'name').catch(() => {
            console.log('  (staff table not found or empty — skipping)');
            return [];
        });
        const bookIssues = await fetchFromSupabase('book_issues', 'created_at');

        console.log('\nStep 2: Inserting into Nile...');

        // 2a. Insert students (composite key: reg_no + course)
        console.log('\n  Inserting students...');
        if (students.length > 0) {
            const cols = Object.keys(students[0]);
            const params = [];
            let inserted = 0;
            const BATCH = 100;

            for (let i = 0; i < students.length; i += BATCH) {
                const batch = students.slice(i, i + BATCH);
                const bParams = [];
                const valueSets = batch.map(row => {
                    const phs = cols.map(col => {
                        bParams.push(row[col] !== undefined ? row[col] : null);
                        return `$${bParams.length}`;
                    });
                    return `(${phs.join(', ')})`;
                });

                const sql = `INSERT INTO students (${cols.join(', ')}) ` +
                            `VALUES ${valueSets.join(', ')} ` +
                            `ON CONFLICT (reg_no, course) DO UPDATE SET ` +
                            `name = EXCLUDED.name, father = EXCLUDED.father, ` +
                            `year = EXCLUDED.year, in_out = EXCLUDED.in_out`;

                await client.query(sql, bParams);
                inserted += batch.length;
                process.stdout.write(`\r    ${inserted}/${students.length} students...`);
            }
            console.log(`\n  Students inserted: ${inserted}`);
        }

        // 2b. Insert staff
        if (staff.length > 0) {
            console.log('\n  Inserting staff...');
            await batchInsertToNile(client, 'staff', staff);
        }

        // 2c. Insert book_issues (must come after students+staff for FK constraints)
        console.log('\n  Inserting book_issues...');
        if (bookIssues.length > 0) {
            const cols = Object.keys(bookIssues[0]);
            let inserted = 0;
            const BATCH = 100;

            for (let i = 0; i < bookIssues.length; i += BATCH) {
                const batch = bookIssues.slice(i, i + BATCH);
                const bParams = [];
                const valueSets = batch.map(row => {
                    const phs = cols.map(col => {
                        bParams.push(row[col] !== undefined ? row[col] : null);
                        return `$${bParams.length}`;
                    });
                    return `(${phs.join(', ')})`;
                });

                const sql = `INSERT INTO book_issues (${cols.join(', ')}) ` +
                            `VALUES ${valueSets.join(', ')} ` +
                            `ON CONFLICT (id) DO UPDATE SET ` +
                            `book_name = EXCLUDED.book_name, author = EXCLUDED.author, ` +
                            `book_no = EXCLUDED.book_no, status = EXCLUDED.status, ` +
                            `return_date = EXCLUDED.return_date, updated_at = EXCLUDED.updated_at`;

                try {
                    await client.query(sql, bParams);
                    inserted += batch.length;
                    process.stdout.write(`\r    ${inserted}/${bookIssues.length} book issues...`);
                } catch (err) {
                    console.error(`\n  Batch error:`, err.message);
                }
            }
            console.log(`\n  Book issues inserted: ${inserted}`);
        }

        // 3. Verify
        console.log('\nStep 3: Verifying migration...');
        const { rows: studentCount } = await client.query('SELECT COUNT(*) FROM students');
        const { rows: staffCount } = await client.query('SELECT COUNT(*) FROM staff');
        const { rows: bookCount } = await client.query('SELECT COUNT(*) FROM book_issues');
        console.log(`  Students in Nile:     ${studentCount[0].count}`);
        console.log(`  Staff in Nile:        ${staffCount[0].count}`);
        console.log(`  Book issues in Nile:  ${bookCount[0].count}`);

        console.log('\n=== Migration completed successfully! ===');
        console.log('You can now start the app with: npm run serve');

    } finally {
        client.release();
        await nilePool.end();
    }
}

migrate().catch(err => {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
});
