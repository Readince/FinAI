// repositories/CustomerRepo.js
import db from '../utils/db.js';

export const CustomerRepo = {
  async create(c, client = null) {
    const runner = client || db;
    const q = `
      INSERT INTO customers
      (national_id,serial_no,first_name,last_name,phone,email,birth_date,gender,nationality,
       mother_name,father_name,address,branch_no)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`;
    const { rows } = await runner.query(q, [
      c.national_id, c.serial_no, c.first_name, c.last_name, c.phone, c.email,
      c.birth_date, c.gender, c.nationality, c.mother_name, c.father_name, c.address, c.branch_no
    ]);
    return rows[0];
  },

  async findByNationalId(nationalId) {
    const { rows } = await db.query('SELECT * FROM customers WHERE national_id=$1', [nationalId]);
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM customers WHERE id=$1', [id]);
    return rows[0] || null;
  }
};
