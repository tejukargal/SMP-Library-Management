// NileClient — Supabase-compatible query builder for Nile PostgreSQL
// Sends parameterized SQL to the backend /api/sql endpoint

class NileQueryBuilder {
    constructor(client, table) {
        this._client = client;
        this._table = table;
        this._operation = 'select';
        this._selectStr = '*';
        this._relatedTables = []; // for JOINs parsed from select('*, table(cols)')
        this._filters = [];
        this._orderBy = null;
        this._limitN = null;
        this._isSingle = false;
        this._insertRows = null;
        this._updateFields = null;
        this._upsertRows = null;
        this._upsertOpts = null;
    }

    // --- Query modifiers ---

    select(cols = '*') {
        // Parse PostgREST-style related table selects: 'col1, col2, related(c1, c2)'
        const related = [];
        const cleaned = cols
            .replace(/(\w+)\(([^)]+)\)/g, (_, tbl, tblCols) => {
                related.push({
                    table: tbl,
                    cols: tblCols.split(',').map(c => c.trim()).filter(Boolean)
                });
                return '';
            })
            .replace(/,\s*,/g, ',')
            .replace(/,\s*$/, '')
            .replace(/^\s*,/, '')
            .trim();

        this._selectStr = cleaned || '*';
        this._relatedTables = related;
        return this;
    }

    eq(col, val) {
        this._filters.push({ type: 'eq', col, val });
        return this;
    }

    neq(col, val) {
        this._filters.push({ type: 'neq', col, val });
        return this;
    }

    ilike(col, pattern) {
        this._filters.push({ type: 'ilike', col, val: pattern });
        return this;
    }

    or(condStr) {
        this._filters.push({ type: 'or', condStr });
        return this;
    }

    in(col, values) {
        this._filters.push({ type: 'in', col, val: values });
        return this;
    }

    order(col, opts = {}) {
        this._orderBy = { col, asc: opts.ascending !== false };
        return this;
    }

    limit(n) {
        this._limitN = n;
        return this;
    }

    single() {
        this._isSingle = true;
        return this;
    }

    insert(data) {
        this._operation = 'insert';
        this._insertRows = Array.isArray(data) ? data : [data];
        return this;
    }

    update(fields) {
        this._operation = 'update';
        this._updateFields = fields;
        return this;
    }

    delete() {
        this._operation = 'delete';
        return this;
    }

    upsert(data, opts = {}) {
        this._operation = 'upsert';
        this._upsertRows = Array.isArray(data) ? data : [data];
        this._upsertOpts = opts;
        return this;
    }

    // --- Thenable (allows await) ---

    then(resolve, reject) {
        this._execute().then(resolve).catch(reject);
    }

    // --- Internal ---

    async _execute() {
        const built = this._build();
        if (!built) return { data: null, error: 'Empty query' };
        const { sql, params } = built;
        return this._client._query(sql, params, this._isSingle, this._operation);
    }

    _build() {
        switch (this._operation) {
            case 'select': return this._buildSelect();
            case 'insert': return this._buildInsert();
            case 'update': return this._buildUpdate();
            case 'delete': return this._buildDelete();
            case 'upsert': return this._buildUpsert();
        }
    }

    // --- SELECT builder ---

    _buildSelect() {
        const params = [];
        const t = this._table;

        // Build SELECT column list
        let selectParts = [];

        if (this._selectStr === '*' || !this._selectStr) {
            selectParts.push(`${t}.*`);
        } else {
            // Specific columns
            selectParts.push(
                this._selectStr.split(',').map(c => `${t}.${c.trim()}`).join(', ')
            );
        }

        const joins = [];

        // Add JSON-aggregated related tables as virtual columns
        for (const rel of this._relatedTables) {
            const fkJoin = this._buildJoin(rel.table);
            if (fkJoin) joins.push(fkJoin);

            const alias = rel.table;
            const fkCol = this._getFKCol(alias);
            const jsonPairs = rel.cols.map(c => `'${c}', ${alias}.${c}`).join(', ');

            selectParts.push(
                `CASE WHEN ${t}.${fkCol} IS NOT NULL ` +
                `THEN json_build_object(${jsonPairs}) END AS ${alias}`
            );
        }

        let sql = `SELECT ${selectParts.join(', ')} FROM ${t}`;
        if (joins.length) sql += ' ' + joins.join(' ');

        const where = this._buildWhere(params, t);
        if (where) sql += ' ' + where;

        if (this._orderBy) {
            const dir = this._orderBy.asc ? 'ASC' : 'DESC';
            sql += ` ORDER BY ${t}.${this._orderBy.col} ${dir}`;
        }

        if (this._limitN !== null) {
            sql += ` LIMIT ${parseInt(this._limitN)}`;
        }

        return { sql, params };
    }

    // Map related table name to the FK column on the current table
    _getFKCol(relatedTable) {
        const map = {
            students: 'student_reg_no',
            staff: 'staff_id'
        };
        return map[relatedTable] || `${relatedTable}_id`;
    }

    // Build LEFT JOIN clause for a related table
    _buildJoin(relatedTable) {
        const t = this._table;
        if (relatedTable === 'students') {
            return `LEFT JOIN students ON ${t}.student_reg_no = students.reg_no ` +
                   `AND ${t}.student_course = students.course`;
        }
        if (relatedTable === 'staff') {
            return `LEFT JOIN staff ON ${t}.staff_id = staff.staff_id`;
        }
        return null;
    }

    // --- INSERT builder ---

    _buildInsert() {
        const rows = this._insertRows;
        if (!rows || !rows.length) return null;

        const cols = Object.keys(rows[0]);
        const params = [];

        const valueSets = rows.map(row => {
            const phs = cols.map(col => {
                params.push(row[col] !== undefined ? row[col] : null);
                return `$${params.length}`;
            });
            return `(${phs.join(', ')})`;
        });

        const sql = `INSERT INTO ${this._table} (${cols.join(', ')}) ` +
                    `VALUES ${valueSets.join(', ')} RETURNING *`;
        return { sql, params };
    }

    // --- UPDATE builder ---

    _buildUpdate() {
        const fields = this._updateFields;
        if (!fields) return null;

        const params = [];
        const sets = Object.entries(fields).map(([col, val]) => {
            params.push(val !== undefined ? val : null);
            return `${col} = $${params.length}`;
        });

        let sql = `UPDATE ${this._table} SET ${sets.join(', ')}`;
        const where = this._buildWhere(params, this._table);
        if (where) sql += ' ' + where;
        sql += ' RETURNING *';

        return { sql, params };
    }

    // --- DELETE builder ---

    _buildDelete() {
        const params = [];
        let sql = `DELETE FROM ${this._table}`;
        const where = this._buildWhere(params, this._table);
        if (where) sql += ' ' + where;
        return { sql, params };
    }

    // --- UPSERT builder ---

    _buildUpsert() {
        const rows = this._upsertRows;
        const opts = this._upsertOpts || {};
        if (!rows || !rows.length) return null;

        const cols = Object.keys(rows[0]);
        const params = [];

        const valueSets = rows.map(row => {
            const phs = cols.map(col => {
                params.push(row[col] !== undefined ? row[col] : null);
                return `$${params.length}`;
            });
            return `(${phs.join(', ')})`;
        });

        // Parse conflict columns
        const conflictCols = opts.onConflict
            ? opts.onConflict.split(',').map(c => c.trim())
            : ['id'];

        let sql = `INSERT INTO ${this._table} (${cols.join(', ')}) ` +
                  `VALUES ${valueSets.join(', ')} ` +
                  `ON CONFLICT (${conflictCols.join(', ')}) `;

        if (opts.ignoreDuplicates) {
            sql += 'DO NOTHING';
        } else {
            const updateCols = cols.filter(c => !conflictCols.includes(c));
            if (updateCols.length) {
                const sets = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
                sql += `DO UPDATE SET ${sets}`;
            } else {
                sql += 'DO NOTHING';
            }
        }

        sql += ' RETURNING *';
        return { sql, params };
    }

    // --- WHERE clause builder ---

    _buildWhere(params, tableAlias) {
        if (!this._filters.length) return '';

        const conditions = this._filters.map(f => {
            if (f.type === 'eq') {
                params.push(f.val);
                return `${tableAlias}.${f.col} = $${params.length}`;
            }
            if (f.type === 'neq') {
                params.push(f.val);
                return `${tableAlias}.${f.col} != $${params.length}`;
            }
            if (f.type === 'ilike') {
                params.push(f.val);
                return `${tableAlias}.${f.col} ILIKE $${params.length}`;
            }
            if (f.type === 'in') {
                const phs = f.val.map(v => {
                    params.push(v);
                    return `$${params.length}`;
                });
                return `${tableAlias}.${f.col} IN (${phs.join(', ')})`;
            }
            if (f.type === 'or') {
                return this._parseOrConditions(f.condStr, params, tableAlias);
            }
            return null;
        }).filter(Boolean);

        return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    }

    // Parse PostgREST OR string: 'col1.ilike.%val%,col2.eq.val'
    // Splits only at commas that are followed by "word.operator."
    _parseOrConditions(condStr, params, tableAlias) {
        // Split on comma only when followed by: word chars + dot + known op + dot
        const parts = condStr.split(/,(?=\w+\.(eq|neq|ilike|in|is|gt|gte|lt|lte)\.)/);

        const conditions = parts.map(part => {
            const firstDot = part.indexOf('.');
            const secondDot = part.indexOf('.', firstDot + 1);
            if (firstDot < 0 || secondDot < 0) return null;

            const col = part.substring(0, firstDot).trim();
            const op = part.substring(firstDot + 1, secondDot).trim().toLowerCase();
            const val = part.substring(secondDot + 1).trim();

            if (op === 'is') {
                if (val === 'null') return `${tableAlias}.${col} IS NULL`;
                if (val === 'notnull') return `${tableAlias}.${col} IS NOT NULL`;
                return null;
            }

            params.push(val);
            const pn = params.length;

            if (op === 'eq') return `${tableAlias}.${col} = $${pn}`;
            if (op === 'neq') return `${tableAlias}.${col} != $${pn}`;
            if (op === 'ilike') return `${tableAlias}.${col} ILIKE $${pn}`;
            if (op === 'gt') return `${tableAlias}.${col} > $${pn}`;
            if (op === 'gte') return `${tableAlias}.${col} >= $${pn}`;
            if (op === 'lt') return `${tableAlias}.${col} < $${pn}`;
            if (op === 'lte') return `${tableAlias}.${col} <= $${pn}`;
            return null;
        }).filter(Boolean);

        return conditions.length ? `(${conditions.join(' OR ')})` : '';
    }
}

// ---- NileClient (drop-in Supabase replacement) ----

class NileClient {
    constructor(apiEndpoint = '/api/sql') {
        this.apiEndpoint = apiEndpoint;
    }

    from(table) {
        return new NileQueryBuilder(this, table);
    }

    async _query(sql, params, isSingle, operation) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql, params })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                return { data: null, error: result.error || 'Query failed' };
            }

            let rows = result.data || [];

            // DELETE doesn't return rows — that's fine
            if (operation === 'delete') {
                return { data: null, error: null };
            }

            // .single() returns one object, not an array
            if (isSingle) {
                if (rows.length === 0) return { data: null, error: 'No rows found' };
                return { data: rows[0], error: null };
            }

            return { data: rows, error: null };
        } catch (err) {
            return { data: null, error: err.message };
        }
    }
}

export { NileClient };
