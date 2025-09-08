// repositories/accountRepo.js
import db from "../utils/db.js";

// --- ortak yardımcılar: status'u TR'ye çevir ---
const mapStatusTR = (s) =>
  s === "ACTIVE" ? "AÇIK" : s === "CLOSED" ? "KAPALI" : s;
const mapRowStatus = (row) =>
  row && "status" in row ? { ...row, status: mapStatusTR(row.status) } : row;
const mapRowsStatus = (rows = []) => rows.map(mapRowStatus);

export const AccountRepo = {
  /* -------------------------- CREATE -------------------------- */
  async create(a, client = null) {
    const runner = client || db;
    const q = `
       INSERT INTO accounts
         (customer_id, currency_code, account_type, balance, interest_rate, account_no, sub_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING
         id, customer_id, currency_code, account_type, balance, interest_rate,
         account_no, sub_no,
         LPAD(sub_no::text, 2, '0') AS sub_no_str,
         status, created_at
     `;
    const { rows } = await runner.query(q, [
      a.customer_id,
      a.currency_code,
      a.account_type,
      a.balance ?? 0,
      a.interest_rate ?? 0,
      a.account_no ?? null, // trigger üretir
      a.sub_no ?? null, // trigger otomatik dolar
    ]);
    return rows[0];
    return mapRowStatus(rows[0]);
  },

  /* ----------------------- QUERY (LIST) ----------------------- */
  async listByCustomerId(customerId, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `
       SELECT
         a.id,
         a.customer_id,
         a.currency_code,
         a.account_type,
         a.balance,
         a.interest_rate,
         a.sub_no,
         LPAD(a.sub_no::text, 2, '0') AS sub_no_str,
         a.account_no,
         a.status,
         a.created_at,
         b.code AS branch_code  -- ✅ gerçek şube kodu (branches.code)
       FROM accounts a
       JOIN customers c ON c.id = a.customer_id
       LEFT JOIN branches b ON b.id = COALESCE(a.branch_id, c.branch_id)
       WHERE a.customer_id = $1
       ORDER BY a.created_at DESC
       `,
      [customerId]
    );
    return rows;
    return mapRowsStatus(rows);
  },

  /* ------------------------ QUERY (ONE) ----------------------- */
  async findByIdForUpdate(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
    return mapRowStatus(rows[0] || null);
  },

  async findById(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `SELECT * FROM accounts WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
    return mapRowStatus(rows[0] || null);
  },

  /* ------------------------- MUTATIONS ------------------------ */
  async addBalance(id, amount, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `UPDATE accounts
          SET balance = balance + $2
        WHERE id = $1
        RETURNING *`,
      [id, Number(amount) || 0]
    );
    return rows[0];
    return mapRowStatus(rows[0]);
  },

  async closeSetZero(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `UPDATE accounts
          SET status = 'CLOSED', balance = 0
        WHERE id = $1
        RETURNING *`,
      [id]
    );
    return rows[0];
    return mapRowStatus(rows[0]);
  },

  async closeAndZero(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `UPDATE accounts
          SET status = 'CLOSED', balance = 0
        WHERE id = $1
        RETURNING *`,
      [id]
    );
    return rows[0];
    return mapRowStatus(rows[0]);
  },

  /* ----------------------- EXTRA: OVERVIEWS ------------------- */
  async getAccountOverview(
    { account_id = null, account_no = null },
    client = null
  ) {
    const runner = client || db;
    const { rows } = await runner.query(
      `SELECT a.id, a.account_no, a.currency_code, a.account_type, a.balance, a.interest_rate,
               a.sub_no, a.status, a.created_at, a.branch_id,
               c.id   AS customer_id, c.first_name, c.last_name, c.email, c.phone, c.national_id,
               COALESCE(a.branch_id, c.branch_id)   AS resolved_branch_id,
               b.code AS branch_code, b.name AS branch_name, b.city AS branch_city, b.district AS branch_district
        FROM accounts a
        JOIN customers c ON c.id = a.customer_id
        LEFT JOIN branches b ON b.id = COALESCE(a.branch_id, c.branch_id)
        WHERE ($1::bigint IS NULL OR a.id = $1)
          AND ($2::text   IS NULL OR a.account_no = $2)
        LIMIT 1`,
      [account_id, account_no]
    );
    return rows[0] || null;
    return mapRowStatus(rows[0] || null);
  },

  async getBranchSummary(
    { branch_id = null, branch_code = null },
    client = null
  ) {
    const runner = client || db;
    const { rows } = await runner.query(
      `WITH b AS (
          SELECT id, code, name, city, district, created_at
          FROM branches
          WHERE ($1::bigint IS NULL OR id = $1)
            AND ($2::int    IS NULL OR code = $2)
          LIMIT 1
        ),
        a AS (
          SELECT branch_id, COUNT(*) AS account_count, COALESCE(SUM(balance),0) AS total_balance
          FROM accounts
          WHERE branch_id = (SELECT id FROM b)
          GROUP BY branch_id
        )
        SELECT b*, a.account_count, a.total_balance
        FROM b
        LEFT JOIN a ON a.branch_id = b.id`,
      [branch_id, branch_code]
    );
    return rows[0] || null;
  },
};
