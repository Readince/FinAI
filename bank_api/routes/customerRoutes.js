import { Router } from "express";
import { postCustomer, getSummaryHandler } from "../controllers/customerController.js";

const r = Router();
r.post("/", postCustomer);
r.get("/summary", getSummaryHandler);
export default r;