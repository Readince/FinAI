import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import customerRoutes from "./routes/customerRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import authRoutes from "./routes/authroute.js";
import errorHandler from "./middlewares/errorhandler.js";
import "./utils/redis.js";
import db from "./utils/db.js";

const app = express();



app.get("/dbcheck", async (req,res)=>{
  try {
    const r = await db.query("SELECT 1 AS ok");
    res.json(r.rows[0]);
  } catch (e) {
    console.error("DBCHECK", e);
    res.status(500).json({ error:"db", detail: e.code || e.message });
  }
});


app.use((req, res, next) => {
  console.log("REQ", req.method, req.url);
  next();
});


/** ---------- Security / Parsers ---------- */
app.use(helmet());
app.use(express.json());
app.use(cookieParser()); // refresh_token gibi httpOnly cookie'leri okuyabilmek için

/** ---------- CORS (refresh için gerekli) ---------- */
// .env → CORS_ORIGIN=http://localhost:5173
// birden fazla origin varsa virgülle ayır: http://localhost:5173,http://localhost:8080
const origins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman gibi originsiz istekler için izin
      if (origins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true, // 🔴 cookie gönder/al için şart
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/** ---------- Routes ---------- */
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);              // mevcut
app.use("/customers", customerRoutes);     // ✅ yeni
app.use("/accounts", accountRoutes);       // ✅ yeni

// Preflight hızlı dönüş (OPTIONS istekleri)
app.options("*", cors({ origin: origins, credentials: true }));

/** ---------- Logging ---------- */
app.use(morgan("dev"));

/** ---------- Routes ---------- */
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/auth", authRoutes); // signup/login/refresh/logout

/** ---------- Error Handler (en sonda) ---------- */
app.use(errorHandler);

/** ---------- Start ---------- */
const port = Number(process.env.PORT || 3001);

// Prod ortamında HTTPS + proxy arkasında kullanıyorsan açman lazım:
// app.set("trust proxy", 1); 
// ve cookie'yi { secure: true, sameSite: "none" } yap.

app.listen(port, () => console.log(`API listening on :${port}`));

