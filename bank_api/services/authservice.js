import redis from "../utils/redis.js";
import { validateUser } from "../models/usermodel.js";
import { signAccessToken } from "../utils/jwt.js";

const SESSION_PREFIX = "session:"; // session:{jti} => tckn (TTL=token süresi)
const BLACKLIST_PREFIX = "blacklist:"; // blacklist:{jti} => 1 (TTL=token kalan süresi)

export async function login(tckn, password) {
  const ok = await validateUser(tckn, password);
  if (!ok) return null;

  const { token, jti } = signAccessToken({ sub: tckn });
  const ttl = Number(process.env.JWT_EXPIRES_SECONDS);

  // Token süresi kadar session tut
  await redis.set(`${SESSION_PREFIX}${jti}`, tckn, { EX: ttl });

  // Opsiyonel: sliding session (inactivity)
  const sliding = String(process.env.SLIDING_SESSION).toLowerCase() === "true";
  if (sliding) {
    await redis.set(`sliding:${jti}`, tckn, {
      EX: Number(process.env.SLIDING_TTL_SECONDS || 20),
    });
  }

  return { token, jti, expiresIn: ttl };
}

export async function isBlacklisted(jti) {
  const val = await redis.get(`${BLACKLIST_PREFIX}${jti}`);
  return Boolean(val);
}

export async function revoke(jti, remainingSeconds = 20) {
  if (!jti) return;
  await redis.set(`${BLACKLIST_PREFIX}${jti}`, 1, { EX: remainingSeconds });
  await redis.del(`session:${jti}`);
  await redis.del(`sliding:${jti}`);
}

export async function touchSliding(jti) {
  const sliding = String(process.env.SLIDING_SESSION).toLowerCase() === "true";
  if (!sliding) return;
  const ttl = Number(process.env.SLIDING_TTL_SECONDS || 20);
  const exists = await redis.exists(`sliding:${jti}`);
  if (exists) await redis.expire(`sliding:${jti}`, ttl);
}
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/authroute.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/auth", authRouter);

app.listen(process.env.PORT || 3001, () => {
  console.log("API up:", process.env.PORT || 3001);
});
