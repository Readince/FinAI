// repositories/CustomerRepo.js
import db from "../utils/db.js";

export const CustomerRepo = {
  /* ---------------- CREATE ---------------- */
  async create(c, client = null) {
    const runner = client || db;

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
      c.birth_date ?? null,
      c.gender ?? null,
      c.nationality ?? null,
      c.mother_name ?? null,
      c.father_name ?? null,
      c.address ?? null,
      c.branch_no ?? null, // eski kolon
      c.branch_code ?? null, // $14
      c.branch_id ?? null, // $15
    ];

    const { rows } = await runner.query(q, params);
    return rows[0];
  },

  /* ---------------- FINDERS ---------------- */
  async findByNationalId(nationalId) {
    const q = `
      SELECT c.*,
             b.code AS branch_code,
             b.name AS branch_name,
             b.city AS branch_city,
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
      SELECT c.*,
             b.code AS branch_code,
             b.name AS branch_name,
             b.city AS branch_city,
             b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.id = $1
      LIMIT 1;
    `;
    const { rows } = await db.query(q, [id]);
    return rows[0] || null;
  },

  async findByName(name, limit = 10) {
    const q = `
      SELECT c.*,
             b.code AS branch_code, b.name AS branch_name,
             b.city AS branch_city, b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.first_name ILIKE $1 OR c.last_name ILIKE $1
      ORDER BY c.id DESC
      LIMIT $2;
    `;
    const { rows } = await db.query(q, [`%${name}%`, limit]);
    return rows;
  },

  async findByEmail(email, limit = 10) {
    const q = `
      SELECT c.*,
             b.code AS branch_code, b.name AS branch_name,
             b.city AS branch_city, b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.email ILIKE $1
      LIMIT $2;
    `;
    const { rows } = await db.query(q, [email, limit]);
    return rows;
  },

  async findByPhone(phone, limit = 10) {
    const q = `
      SELECT c.*,
             b.code AS branch_code, b.name AS branch_name,
             b.city AS branch_city, b.district AS branch_district
      FROM customers c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.phone ILIKE $1
      LIMIT $2;
    `;
    const { rows } = await db.query(q, [`%${phone}%`, limit]);
    return rows;
  },

  /* ---------------- LIST WITH FILTERS (legacy) ---------------- */
  /**
   * Eski versiyon: total döndürmez, sadece items döner.
   */
  async listByBranchWithAccounts({
    branch_id,
    account_type = null,
    currency_code = null,
    q = null,
    limit = 50,
    offset = 0,
  }) {
    const params = [];
    let i = 1;

    const whereParts = [];
    if (branch_id && Number(branch_id) !== 1) {
      whereParts.push(`COALESCE(a.branch_id, c.branch_id) = $${i++}`);
      params.push(Number(branch_id));
    }
    if (q) {
      whereParts.push(
        `(c.national_id ILIKE $${i} OR c.first_name ILIKE $${i} OR c.last_name ILIKE $${i})`
      );
      params.push(`%${q}%`);
      i++;
    }

    const joinFilters = [];
    if (account_type) {
      joinFilters.push(`a.account_type = $${i++}`);
      params.push(account_type);
    }
    if (currency_code) {
      joinFilters.push(`a.currency_code = $${i++}`);
      params.push(currency_code);
    }

    const qText = `
      SELECT
        c.id, c.national_id, c.first_name, c.last_name, c.branch_id, c.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'account_no', a.account_no,
              'currency_code', a.currency_code,
              'balance', a.balance,
              'account_type', a.account_type,
              'interest_rate', a.interest_rate,
              'status', a.status,
              'branch_id', a.branch_id,
              'created_at', a.created_at
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS accounts
      FROM customers c
      LEFT JOIN accounts a
        ON a.customer_id = c.id
        ${joinFilters.length ? `AND ${joinFilters.join(" AND ")}` : ""}
      ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    params.push(Number(limit) || 50, Number(offset) || 0);

    const { rows } = await db.query(qText, params);
    return rows;
  },

  /* ---------------- LIST WITH FILTERS (PAGED + TOTAL) --------- */
  /**
   * Şube + filtrelerle müşteri + hesap listesi (sayfalı)
   * @returns { items: any[], total: number }
   */
  async listByBranchWithAccountsPaged({
    branch_id,
    account_type = null,
    currency_code = null,
    q = null,
    limit = 20,
    offset = 0,
  }) {
    const params = [];
    let i = 1;

    // WHERE (müşteri/şube + serbest arama)
    const whereParts = [];
    if (branch_id && Number(branch_id) !== 1) {
      whereParts.push(`COALESCE(a.branch_id, c.branch_id) = $${i++}`);
      params.push(Number(branch_id));
    }
    if (q) {
      whereParts.push(
        `(c.national_id ILIKE $${i} OR c.first_name ILIKE $${i} OR c.last_name ILIKE $${i})`
      );
      params.push(`%${q}%`);
      i++;
    }

    // JOIN filtreleri (hesap tipi, döviz)
    const joinFilters = [];
    if (account_type) {
      joinFilters.push(`a.account_type = $${i++}`);
      params.push(account_type);
    }
    if (currency_code) {
      joinFilters.push(`a.currency_code = $${i++}`);
      params.push(currency_code);
    }

    // 1) Filtreye uyan müşteri id'leri (distinct) + total
    const idsSql = `
      WITH filtered AS (
        SELECT DISTINCT c.id
        FROM customers c
        LEFT JOIN accounts a ON a.customer_id = c.id
          ${joinFilters.length ? `AND ${joinFilters.join(" AND ")}` : ""}
        ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
      ),
      total AS (
        SELECT COUNT(*)::int AS cnt FROM filtered
      )
      SELECT f.id, t.cnt AS total
      FROM filtered f
      CROSS JOIN total t
      ORDER BY f.id DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    const idsRes = await db.query(idsSql, [
      ...params,
      Number(limit),
      Number(offset),
    ]);
    const pageIds = idsRes.rows.map((r) => r.id);
    const total = idsRes.rows[0]?.total ?? 0;

    if (pageIds.length === 0) return { items: [], total };

    // 2) Sayfadaki müşterileri hesaplarıyla getir
    const q2 = `
      SELECT
        c.id, c.national_id, c.first_name, c.last_name, c.branch_id, c.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', a.id,
              'account_no', a.account_no,
              'currency_code', a.currency_code,
              'balance', a.balance,
              'account_type', a.account_type,
              'interest_rate', a.interest_rate,
              'status', a.status,
              'branch_id', a.branch_id,
              'created_at', a.created_at
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS accounts
      FROM customers c
      LEFT JOIN accounts a ON a.customer_id = c.id
      WHERE c.id = ANY($1::bigint[])
      GROUP BY c.id
      ORDER BY c.id DESC
    `;
    const itemsRes = await db.query(q2, [pageIds]);

    return { items: itemsRes.rows, total };
  },
};
