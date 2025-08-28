import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
windowMs: 60 * 1000,
max: 10,
standardHeaders: true,
legacyHeaders: false,
message: { success: false, message: "Çok fazla deneme, lütfen bekleyin" },
});