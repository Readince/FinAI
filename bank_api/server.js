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
// Eğer Redis kullanmıyorsan bu import’u kaldırabilirsin:
// import "./utils/redis.js";

import db from "./utils/db.js";
import { tools } from "./services/ai/tools.js";
import { runToolCall } from "./services/ai/dbTools.js";
import { sanitizePIIText } from "./utils/mask.js";

const app = express();

/** ---------- Quick DB check ---------- */
app.get("/dbcheck", async (req, res) => {
  try {
    const r = await db.query("SELECT 1 AS ok");
    res.json(r.rows[0]);
  } catch (e) {
    console.error("DBCHECK", e);
    res.status(500).json({ error: "db", detail: e.code || e.message });
  }
});

app.use((req, res, next) => {
  console.log("REQ", req.method, req.url);
  next();
});

/** ---------- Security / Parsers ---------- */
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

/** ---------- CORS ---------- */
// .env → CORS_ORIGIN=http://localhost:5173  (virgül ile çoklu origin verilebilir)
const origins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors({ origin: origins, credentials: true }));
// Chatbot frontend “ping” için özel preflight
app.options("/ai/chat", (req, res) => res.sendStatus(204));

/** ---------- Logging ---------- */
app.use(morgan("dev"));

/** ---------- Health ---------- */
app.get("/health", (req, res) => res.json({ ok: true }));

/** ---------- App Routes ---------- */
app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/accounts", accountRoutes);

/** =================================================================
 *  AI Chat Proxy → Ollama (SSE streaming + intent gating + tools)
 * =================================================================*/
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

// NEW: deterministik varsayılanlar
const defaultOptions = { temperature: 0, top_p: 0.9 };

// NEW: daha sert kurallar ekledim
const systemMsg = {
  role: "system",
  content: [
    "Sen bir banka asistanısın. Yanıtları Türkçe ver.",
    "Müşteri/hesap bilgisi verirken YALNIZCA verilen tool sonuçlarından yararlan.",
    "Tool sonuçlarında bulunmayan kişisel verileri ASLA uydurma veya açıklama.",
    "Tool çağırmak için yeterli kriter yoksa önce kullanıcıdan kriter iste.",
    "Selamlama/sohbet mesajlarında asla müşteri verisi getirme; araç çağırma.",
    "TC/telefon/kart/IBAN gibi PII daima maskeli olmalı (backend de maskeleyecek).",
    // NEW:
    "Müşteri/hesap bilgisi istenirken araç (tool) çağırmadan ASLA serbest yanıt üretme; araç çağırmak için yeterli kriter yoksa KESİN biçimde kriter iste ve dur.",
    "Tool sonucu yoksa 'kayıt bulunamadı' veya 'yetersiz kriter' de; uydurma."
  ].join("\n"),
};

// Basit niyet kontrolü (sadece anahtar kelime + sayı + İSİM)  // NEW
function allowToolsFor(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const t = (lastUser?.content || "").trim();

  const kw =
    /(müşteri|hesap|iban|tc|kimlik|telefon|e-?posta|email|şube|account|customer|id)/i;
  const hasDigits = /\d{4,}/.test(t);

  // İsim benzeri ifade (1–4 kelime, harf ağırlıklı, rakamsız)
  const nameLike = (() => {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 4) return false;
    const letterRe = /^[A-Za-zÇĞİIÖŞÜçğıiöşü\-'.]+$/;
    const allLetters = words.every((w) => letterRe.test(w));
    return allLetters && !hasDigits;
  })();

  return kw.test(t) || hasDigits || nameLike;
}

function extractTcFromMessages(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content) return null;
  const m = lastUser.content.match(/\b\d{11}\b/);
  return m ? m[0] : null;
}

// NEW: İsim çıkarımı
function extractNameFromMessages(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content) return null;
  const text = lastUser.content.trim();

  // TC/e-posta/telefon varsa isimle uğraşma
  if (/\b\d{11}\b/.test(text)) return null;
  if (/\+?\d[\d\s\-()]{9,}/.test(text)) return null;
  if (/\b\S+@\S+\.\S+\b/.test(text)) return null;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) return null;

  const letterRe = /^[A-Za-zÇĞİIÖŞÜçğıiöşü\-'.]+$/;
  if (!words.every((w) => letterRe.test(w))) return null;

  const ban = new Set([
    "müşteri",
    "hesap",
    "tc",
    "kimlik",
    "telefon",
    "email",
    "e-posta",
    "şube",
    "account",
    "customer",
    "id",
  ]);
  if (words.length === 1 && ban.has(words[0].toLowerCase())) return null;

  return text;
}

/**
 * POST /ai/chat
 * Body:
 * {
 *   messages: [{ role:"system"|"user"|"assistant", content:"..." }, ...],
 *   options?: { temperature, top_p, num_ctx, stop, ... },
 *   model?: string
 * }
 */
app.post("/ai/chat", async (req, res) => {
  try {
    const { messages = [], options = {}, model } = req.body || {};

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const useTools = allowToolsFor(messages);
    const tcFromText = useTools ? extractTcFromMessages(messages) : null;

    // 0) 11 haneli TC varsa → modeli atla, direkt tool (mevcut)
    if (tcFromText) {
      const normTc = tcFromText.replace(/\D/g, "");
      const resultRows = await runToolCall("find_customer", {
        national_id: normTc,
        limit: 5,
      });

      let content = "";
      if (!resultRows?.length) {
        content = `Kayıt bulunamadı (TC: ${normTc.slice(
          0,
          2
        )}*******${normTc.slice(-2)}).`;
      } else {
        content = resultRows
          .map(
            (r) =>
              `Müşteri: ${r.full_name || "-"}\n` +
              `TC: ${r.national_id_masked || "-"}\n` +
              `Telefon: ${r.phone_masked || "-"}\n` +
              `Şube ID: ${r.branch_id ?? "-"}`
          )
          .join("\n\n");
      }

      res.write(
        `data: ${JSON.stringify({
          phase: "tool-bypass",
          args: { national_id: normTc },
        })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({
          message: { role: "assistant", content },
        })}\n\n`
      );
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // NEW 0.1) İSİM geldiyse → modeli atla, direkt tool
    if (useTools) {
      const nameFromText = extractNameFromMessages(messages);
      if (nameFromText) {
        const resultRows = await runToolCall("find_customer", {
          name: nameFromText,
          limit: 5,
        });

        let content = "";
        if (!resultRows?.length) {
          content = `“${nameFromText}” için eşleşme bulunamadı.\nDaha fazla kriter (ör. şehir/şube, e-posta, telefon) verebilir misin?`;
        } else {
          content = resultRows
            .map((r, i) => {
              return [
                `#${i + 1} Müşteri: ${r.full_name || "-"}`,
                `E-posta: ${r.email || "-"}`,
                `Telefon: ${r.phone_masked || "-"}`,
                `TC: ${r.national_id_masked || "-"}`,
                `Şube ID: ${r.branch_id ?? "-"}`,
              ].join("\n");
            })
            .join("\n\n");

          // İSTERSEN: Tek eşleşmede otomatik hesapları da getir:
          // if (resultRows.length === 1 && resultRows[0]?.id) {
          //   const combo = await runToolCall("find_customer_and_accounts", { id: resultRows[0].id, max_accounts: 10 });
          //   if (combo?.accounts?.length) {
          //     content += `\n\nHesaplar (${combo.accounts.length}):\n` +
          //       combo.accounts.map(a => `• ${a.account_no} (${a.currency_code}) - ${a.status}`).join("\n");
          //   }
          // }
        }

        res.write(
          `data: ${JSON.stringify({
            phase: "tool-bypass",
            args: { name: nameFromText },
          })}\n\n`
        );
        res.write(
          `data: ${JSON.stringify({
            message: { role: "assistant", content },
          })}\n\n`
        );
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      }
    }

    // 1) Konuşmayı hazırla
    let convo = [systemMsg, ...messages];
    if (useTools) {
      convo.unshift({
        role: "system",
        content:
          "Kullanıcı müşteri/hesap verisi istiyorsa uygun tool'u çağır. Yetersiz kriter varsa önce iste.",
      });
    }

    // 2) İlk Ollama çağrısı (stream=false; tool planı için)
    let resp = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || OLLAMA_MODEL,
        messages: convo,
        tools: useTools ? tools : undefined,
        stream: false,
        options: { ...defaultOptions, ...options }, // NEW deterministik
      }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      res.write(
        `data: ${JSON.stringify({
          error: "ollama_request_failed",
          detail: text,
        })}\n\n`
      );
      return res.end();
    }
    let j = await resp.json();

    const toolTrace = [];

    // 3) Tool çağrıları bitene kadar döngü
    while (useTools && j?.message?.tool_calls?.length) {
      for (const tc of j.message.tool_calls) {
        const name = tc.function?.name;
        const rawArgs = tc.function?.arguments || "{}";
        let args = {};
        try {
          args = JSON.parse(rawArgs);
        } catch {}

        let result;
        try {
          result = await runToolCall(name, args);
        } catch (e) {
          res.write(
            `data: ${JSON.stringify({
              error: "tool_error",
              name,
              detail: e?.message || String(e),
            })}\n\n`
          );
          return res.end();
        }

        // debug/izleme
        res.write(`data: ${JSON.stringify({ phase: "tool", name, args })}\n\n`);
        toolTrace.push({ name, args, result });

        // Tool sonucunu modele ver
        convo = [
          ...convo,
          j.message,
          { role: "tool", name, content: JSON.stringify(result) },
        ];

        // Devam: modelden sonraki adımı al
        resp = await fetch(`${OLLAMA_HOST}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model || OLLAMA_MODEL,
            messages: convo,
            tools: useTools ? tools : undefined,
            stream: false,
            options: { ...defaultOptions, ...options }, // NEW deterministik
          }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          res.write(
            `data: ${JSON.stringify({
              error: "ollama_request_failed",
              detail: text,
            })}\n\n`
          );
          return res.end();
        }
        j = await resp.json();
      }
    }

    // 4) Final içerik → PII sanitize
    const contentRaw = j?.message?.content || "";
    const content = sanitizePIIText(contentRaw);

    res.write(
      `data: ${JSON.stringify({ message: { role: "assistant", content } })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("AI_CHAT_ERROR", err);
    res.write(
      `data: ${JSON.stringify({
        error: "proxy_error",
        detail: err?.message || String(err),
      })}\n\n`
    );
    res.end();
  }
});

// Geçici debug; iş bitince kaldır
app.get("/debug/customer_by_tc", async (req, res) => {
  try {
    const tc = String(req.query.tc || "");
    const norm = tc.replace(/\D/g, "");
    const q = `
      SELECT id, first_name, last_name, national_id
      FROM customers
      WHERE regexp_replace(national_id, '\\D', '', 'g') = $1
      LIMIT 5;
    `;
    const { rows } = await db.query(q, [norm]);
    res.json({ norm, count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** ---------- Error Handler (en sonda) ---------- */
app.use(errorHandler);

/** ---------- Start ---------- */
const port = Number(process.env.PORT || 3001);
// app.set("trust proxy", 1); // proxy/https kullanıyorsan aç
app.listen(port, () => console.log(`API listening on :${port}`));
