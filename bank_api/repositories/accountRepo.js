import db from '../utils/db.js';

export const AccountRepo = {
  async create(a, client = null) {
    const runner = client || db;
    const q = `
      INSERT INTO accounts
      (customer_id, currency_code, account_type, balance, interest_rate, account_no, sub_no)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING
        id, customer_id, currency_code, account_type, balance, interest_rate,
        account_no, sub_no,
        LPAD(sub_no::text, 2, '0') AS sub_no_str,   -- <-- gerçek kolona gerek yok
        status, created_at
    `;
    const { rows } = await runner.query(q, [
      a.customer_id,
      a.currency_code,
      a.account_type,
      a.balance ?? 0,
      a.interest_rate ?? 0,
      a.account_no ?? null, // trigger varsa üretir
      a.sub_no ?? null      // trigger varsa 1,2,3...
    ]);
    return rows[0];
  },

  async listByCustomerId(customerId, client = null) {
    const runner = client || db;
    const { rows } = await runner.query(
      `
      SELECT
        currency_code, balance, account_type, interest_rate,
        sub_no,
        LPAD(sub_no::text, 2, '0') AS sub_no_str,   -- <-- burada da ifade ile üret
        account_no, status, created_at
      FROM accounts
      WHERE customer_id=$1
      ORDER BY created_at DESC
      `,
      [customerId]
    );
    return rows;
  }
};
