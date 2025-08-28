import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const AT_TTL = Number(process.env.JWT_EXPIRES_SECONDS || 120);
const RT_TTL = Number(process.env.REFRESH_EXPIRES_SECONDS || 604800);

export function signAccessToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, process.env.JWT_SECRET, {
    expiresIn: AT_TTL,
  });
  return { token, jti, expiresIn: AT_TTL };
}

export function signRefreshToken(payload) {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: RT_TTL,
  });
  return { token, jti, expiresIn: RT_TTL };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}