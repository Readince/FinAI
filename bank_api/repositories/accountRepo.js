// repositories/accountRepo.js
import db from "../utils/db.js";

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
      a.sub_no ?? null      // trigger otomatik dolar
    ]);
    return rows[0];
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
  },

  /* ------------------------ QUERY (ONE) ----------------------- */
  // Kapanış servisi için; satırı kilitleyerek (FOR UPDATE) okur.
  async findByIdForUpdate(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  // Basit ihtiyaçlar için kilitlemeden tekil getir (opsiyonel)
  async findById(id, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `SELECT * FROM accounts WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /* ------------------------- MUTATIONS ------------------------ */
  // Bakiyeyi artır (transfer hedefi için)
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
  },

  // Kapat + bakiyeyi 0'la (0 bakiye senaryosunda da kullanılır)
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
  },

  // Aynı işlev; serviste isim olarak daha açıklayıcı dursun diye ayrık tuttuk
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
  },
};
