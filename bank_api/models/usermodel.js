import redis from "../utils/redis.js";
import bcrypt from "bcryptjs";

const USERS_KEY = "users";

export async function setUser(tckn, password) {
const useBcrypt = String(process.env.USE_BCRYPT).toLowerCase() === "true";
const value = useBcrypt ? await bcrypt.hash(password, 10) : password;
await redis.hSet(USERS_KEY, tckn, value);
}

export async function getUserPassword(tckn) {
return await redis.hGet(USERS_KEY, tckn);
}

export async function validateUser(tckn, password) {
const stored = await getUserPassword(tckn);
if (!stored) return false;
const useBcrypt = String(process.env.USE_BCRYPT).toLowerCase() === "true";
if (useBcrypt) return await bcrypt.compare(password, stored);
return stored === password;
}
