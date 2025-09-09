import { Router } from "express";
import { postAccount, closeAccount } from "../controllers/accountController.js";
// import auth from "../middlewares/auth.js"; // ŞİMDİLİK KAPAT

const r = Router();
// r.post("/", auth, postAccount);
r.post("/", postAccount); // ✅ auth yok

// NEW: hesap kapatma
r.post("/:id/close", closeAccount);

export default r;
