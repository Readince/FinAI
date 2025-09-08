// routes/customerRoutes.js
import { Router } from "express";
import {
  postCustomer,
  getSummaryHandler,
  listByBranchHandler,   // ✅ EKLENDİ
} from "../controllers/customerController.js";

const r = Router();

r.post("/", postCustomer);
r.get("/summary", getSummaryHandler);
r.get("/by-branch", listByBranchHandler); // ✅ YENİ ROUTE

export default r;

