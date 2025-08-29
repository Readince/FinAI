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

// Node 18+ 'fetch' global; 16/18 altındaysan:
// import fetch from "node-fetch";

const app = express();

/** ---------- Quick DB check ---------- */
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
app.use(express.json({ limit: "2mb" })); // JSON limit ekledim
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
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight hızlı dönüş
app.options("*", cors({ origin: origins, credentials: true }));

/** ---------- Logging ---------- */
app.use(morgan("dev"));

/** ---------- Health ---------- */
app.get("/health", (req, res) => res.json({ ok: true })); // duplicate'i kaldırdım

/** ---------- App Routes ---------- */
app.use("/auth", authRoutes);          // signup/login/refresh/logout
app.use("/customers", customerRoutes); // mevcut rotaların
app.use("/accounts", accountRoutes);

/** =================================================================
 *  NEW: AI Chat Proxy → Ollama (SSE streaming)
 * =================================================================*/
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3n:e4b";

/**
 * POST /ai/chat
 * Body:
 * {
 *   messages: [{ role:"system"|"user"|"assistant", content:"..." }, ...],
 *   options?: { temperature, top_p, num_ctx, stop, ... },
 *   model?: string  // override etmek istersen
 * }
 */
app.post("/ai/chat", async (req, res) => {
  try {
    const { messages = [], options = {}, model } = req.body || {};
    // SSE başlıkları
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || OLLAMA_MODEL,
        messages,
        stream: true,
        options,
      }),
    });

    if (!r.ok || !r.body) {
      const text = await r.text().catch(() => "");
      res.write(`data: ${JSON.stringify({ error: "ollama_request_failed", detail: text })}\n\n`);
      return res.end();
    }

    // Ollama satır-satır JSON stream gönderir → doğrudan ileri ilet
    for await (const chunk of r.body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error("AI_CHAT_ERROR", err);
    // SSE uyumlu basit hata
    res.write(`data: ${JSON.stringify({ error: "proxy_error", detail: err.message })}\n\n`);
    res.end();
  }
});

/** ---------- Error Handler (en sonda) ---------- */
app.use(errorHandler);

/** ---------- Start ---------- */
const port = Number(process.env.PORT || 3001);

// Prod ortamında HTTPS + proxy arkasında kullanıyorsan açman lazım:
// app.set("trust proxy", 1);
// ve cookie'yi { secure: true, sameSite: "none" } yap.

app.listen(port, () => console.log(`API listening on :${port}`));


