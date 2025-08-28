import { createCustomer, getSummary } from "../services/customerService.js";

export async function postCustomer(req, res) {
  try {
    const created = await createCustomer(req.body);
    res.status(201).json(created);
  } catch (e) {
    if (e.message === "VALIDATION_TCKN") return res.status(400).json({ msg:"TCKN 11 hane olmalı" });
    if (e.message === "DUPLICATE_TCKN")  return res.status(409).json({ msg:"Bu TCKN/VKN zaten kayıtlı" });
    console.error(e); return res.status(500).json({ msg:"DB error" });
  }
}

export async function getSummaryHandler(req, res) {
  const nationalId = String(req.query.national_id || "");
  const s = await getSummary(nationalId);
  if (!s) return res.sendStatus(404);
  res.json(s);
}
