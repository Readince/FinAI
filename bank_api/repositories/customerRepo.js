// repositories/CustomerRepo.js
import db from '../utils/db.js';

export const CustomerRepo = {
  /**
   * c: {
   *   national_id, serial_no, first_name, last_name, phone, email,
   *   birth_date, gender, nationality, mother_name, father_name, address,
   *   branch_no?,         // eski kolon (opsiyonel, null kalabilir)
   *   branch_id?,         // doğrudan id verirsen öncelik bu
   *   branch_code?        // id vermezsen code -> id çözülür (1..n)
   * }
   */
  async create(c, client = null) {
    const runner = client || db;

    // Not: branch_id öncelikli. Yoksa branch_code ile branches tablosundan id çözüyoruz.
    const q = `
      INSERT INTO customers
      (national_id,serial_no,first_name,last_name,phone,email,birth_date,gender,nationality,
       mother_name,father_name,address,branch_no,branch_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        COALESCE($15, (SELECT id FROM branches WHERE code = $14))
      )
      RETURNING *;
    `;

    const params = [
      c.national_id,
      c.serial_no ?? null,
      c.first_name,
      c.last_name,
      c.phone ?? null,
      c.email ?? null,
      c.birth_date ?? null,     // DATE ise "YYYY-MM-DD" string bekliyoruz
      c.gender ?? null,         // 'E' | 'K' | null
      c.nationality ?? null,    // 'TR' | 'YABANCI' | null
      c.mother_name ?? null,
      c.father_name ?? null,
      c.address ?? null,
      c.branch_no ?? null,      // eski kolon (opsiyonel)
      c.branch_code ?? null,    // $14
      c.branch_id ?? null       // $15
    ];

    const { rows } = await runner.query(q, params);
    return rows[0];
  },

  async findByNationalId(nationalId) {
    const q = `
      SELECT
        c.*,
        b.code     AS branch_code,
        b.name     AS branch_name,
        b.city     AS branch_city,
        b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.national_id = $1
      LIMIT 1;
    `;
    const { rows } = await db.query(q, [nationalId]);
    return rows[0] || null;
  },

  async findById(id) {
    const q = `
      SELECT
        c.*,
        b.code     AS branch_code,
        b.name     AS branch_name,
        b.city     AS branch_city,
        b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.id = $1
      LIMIT 1;
    `;
    const { rows } = await db.query(q, [id]);
    return rows[0] || null;
  }
};
