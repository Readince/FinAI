// utils/db.js
import { Pool, types } from "pg";
import "dotenv/config";

/**
 * Postgres tip parser ayarları
 *  - 1082 = DATE  → string olarak aynen döndür ("YYYY-MM-DD")
 *  - 1114 = TIMESTAMP (TZ'siz) → default bırakıyoruz
 *  - 1184 = TIMESTAMPTZ        → default bırakıyoruz
 *
 * Not: birth_date artık DATE olduğu için 1082 yeterli.
 */
types.setTypeParser(1082, (val) => val); // "2003-03-29" gibi gelir

const {
  DATABASE_URL,
  PGHOST = "127.0.0.1",
  PGPORT = "5432",
  PGUSER = "postgres",
  PGPASSWORD = "postgres",
  PGDATABASE = "bank",
  PGSSLMODE = "disable", // "require" ise SSL açılır
} = process.env;

const useUrl = !!DATABASE_URL;

const pool = useUrl
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: /^(require|on|true)$/i.test(PGSSLMODE) ? { rejectUnauthorized: false } : false,
      keepAlive: true,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      max: 10,
    })
  : new Pool({
      host: PGHOST === "localhost" ? "127.0.0.1" : PGHOST, // IPv4'e zorla
      port: Number(PGPORT),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl: /^(require|on|true)$/i.test(PGSSLMODE) ? { rejectUnauthorized: false } : false,
      keepAlive: true,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      max: 10,
    });

pool.on("error", (err) => {
  console.error("PG pool error:", err);
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(), // transaction için
};

export default db;

