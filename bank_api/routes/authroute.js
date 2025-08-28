import express from "express";
// bcrypt derleme sorunu varsa: import bcrypt from "bcryptjs";
import bcrypt from "bcrypt";
import redis from "../utils/redis.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { validateUser } from "../models/usermodel.js"; // varsa kalsın

const router = express.Router();

const USER_PREFIX = "user:"; // user:{tckn} -> bcrypt hash
const RT_PREFIX   = "rtk:";  // rtk:{jti}  -> sub(tckn)

const cookieOpts = {
  httpOnly: true,
  secure: false,     // PROD'da true + app.set("trust proxy", 1) + sameSite:"none"
  sameSite: "lax",
  path: "/",
};

const isValidTckn = (s) => /^\d{11}$/.test(s);
const isValidPass = (p) => typeof p === "string" && p.length >= 6;

/* --------- SIGNUP --------- */
router.post("/signup", async (req, res) => {
  try {
    const { username: tckn, password } = req.body || {};
    if (!isValidTckn(tckn) || !isValidPass(password)) {
      return res.status(400).json({ success: false, message: "Geçersiz TCKN/şifre" });
    }
    const key = `${USER_PREFIX}${tckn}`;
    if (await redis.exists(key)) {
      return res.status(409).json({ success: false, message: "Kullanıcı zaten var" });
    }
    const hash = await bcrypt.hash(password, 10);
    await redis.set(key, hash);
    return res.json({ success: true, message: "Kayıt başarılı" });
  } catch (e) {
    console.error("signup error:", e);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

/* ---------- LOGIN (AT + RT) ---------- */
router.post("/login", async (req, res) => {
  try {
    const { username: tckn, password } = req.body || {};
    if (!isValidTckn(tckn) || !isValidPass(password)) {
      return res.status(400).json({ success: false, message: "Geçersiz TCKN/şifre" });
    }

    const key = `${USER_PREFIX}${tckn}`;
    const hash = await redis.get(key);

    let ok = false;
    if (hash) {
      ok = await bcrypt.compare(password, hash);
    } else if (typeof validateUser === "function") {
      ok = await validateUser(tckn, password);
    }
    if (!ok) {
      return res.status(401).json({ success: false, message: "Geçersiz kimlik bilgileri" });
    }

    // Access
    const { token: at, jti: atJti, expiresIn: atExp } = signAccessToken({ sub: tckn });

    // Refresh → Redis + Cookie
    const { token: rt, jti: rtJti, expiresIn: rtExp } = signRefreshToken({ sub: tckn });
    await redis.set(`${RT_PREFIX}${rtJti}`, tckn, { EX: rtExp });
    res.cookie("refresh_token", rt, { ...cookieOpts, maxAge: rtExp * 1000 });

    return res.json({ success: true, token: at, jti: atJti, expiresIn: atExp });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

/* ---------- REFRESH (rotate RT + yeni AT) ---------- */
router.post("/refresh", async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ success: false, message: "Refresh yok" });

    let payload;
    try {
      payload = verifyRefreshToken(rt); // { sub, jti, iat, exp }
    } catch {
      return res.status(401).json({ success: false, message: "Refresh geçersiz/expired" });
    }

    const key = `${RT_PREFIX}${payload.jti}`;
    const subInRedis = await redis.get(key);
    if (!subInRedis || subInRedis !== payload.sub) {
      return res.status(401).json({ success: false, message: "Refresh tanınmıyor" });
    }

    // Rotate RT
    await redis.del(key);
    const { token: newRt, jti: newRtJti, expiresIn: newRtExp } = signRefreshToken({ sub: payload.sub });
    await redis.set(`${RT_PREFIX}${newRtJti}`, payload.sub, { EX: newRtExp });
    res.cookie("refresh_token", newRt, { ...cookieOpts, maxAge: newRtExp * 1000 });

    // Yeni AT
    const { token: newAt, jti: newAtJti, expiresIn: newAtExp } = signAccessToken({ sub: payload.sub });
    return res.json({ success: true, token: newAt, jti: newAtJti, expiresIn: newAtExp });
  } catch (e) {
    console.error("refresh error:", e);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

/* ---------- LOGOUT ---------- */
router.post("/logout", async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) {
      try {
        const p = verifyRefreshToken(rt);
        await redis.del(`${RT_PREFIX}${p.jti}`);
      } catch { /* yok say */ }
    }
    res.clearCookie("refresh_token", { ...cookieOpts, maxAge: 0 });
    return res.json({ success: true, message: "Çıkış yapıldı" });
  } catch (e) {
    console.error("logout error:", e);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

/* ----- test için korumalı örnek ----- */
function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Auth yok" });
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token geçersiz" });
  }
}
router.get("/me", auth, (req, res) => {
  res.json({ success: true, sub: req.user.sub, jti: req.user.jti });
});

export default router;
