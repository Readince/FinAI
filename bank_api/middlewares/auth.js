import { verifyAccessToken } from "../utils/jwt.js";
import { isBlacklisted, touchSliding } from "../services/authservice.js";

export default async function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token)
      return res.status(401).json({ success: false, message: "Yetkisiz" });

    const payload = verifyAccessToken(token);
    if (!payload?.jti)
      return res
        .status(401)
        .json({ success: false, message: "Token geçersiz" });

    if (await isBlacklisted(payload.jti)) {
      return res
        .status(401)
        .json({ success: false, message: "Oturum sonlandırıldı" });
    }

    await touchSliding(payload.jti);

    req.user = { tckn: payload.sub, jti: payload.jti, exp: payload.exp };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Token doğrulanamadı" });
  }
}
