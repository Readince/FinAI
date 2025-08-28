import  db  from '../utils/db.js';

export const AccountRepo = {
  async create(a) {
    const q = `
      INSERT INTO accounts
      (customer_id,currency_code,account_type,balance,interest_rate,account_no,sub_no)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`;
    const { rows } = await db.query(q, [
      a.customer_id, a.currency_code, a.account_type, a.balance ?? 0,
      a.interest_rate ?? 0, a.account_no, a.sub_no ?? null
    ]);
    return rows[0];
  },

  async listByCustomerId(customerId) {
    const { rows } = await db.query(
      'SELECT currency_code, balance, account_type, interest_rate, sub_no, account_no, status FROM accounts WHERE customer_id=$1 ORDER BY created_at DESC',
      [customerId]
    );
    return rows;
  }
};
