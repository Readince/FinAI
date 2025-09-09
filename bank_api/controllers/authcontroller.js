import jwt from "jsonwebtoken";
import { login, revoke } from "../services/authservice.js";

export async function postLogin(req, res) {
  const { username: tckn, password } = req.body || {};
  if (!tckn || !password)
    return res.status(400).json({ success: false, message: "Eksik bilgi" });

  const result = await login(tckn, password);
  if (!result)
    return res
      .status(401)
      .json({ success: false, message: "TCKN veya şifre hatalı" });

  res.json({ success: true, token: result.token, expiresIn: result.expiresIn });
}

export async function getMe(req, res) {
  res.json({ success: true, user: { tckn: req.user.tckn } });
}

export async function postLogout(req, res) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.json({ success: true });

    const payload = jwt.decode(token);
    const nowSec = Math.floor(Date.now() / 1000);
    const remaining = Math.max(1, (payload?.exp || nowSec) - nowSec);
    await revoke(payload?.jti, remaining);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true });
  }
}
