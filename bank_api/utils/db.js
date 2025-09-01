// utils/db.js
import { Pool } from "pg";
import "dotenv/config";

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
