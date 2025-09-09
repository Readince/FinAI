// controllers/customerController.js
import { createCustomer, getSummary } from "../services/customerService.js";
import { CustomerRepo } from "../repositories/CustomerRepo.js";

export async function postCustomer(req, res) {
  try {
    const { open_default_account, ...dto } = req.body;
    const { customer, default_account } = await createCustomer(dto, {
      openDefault: !!open_default_account,
    });
    return res.status(201).json({ customer, default_account });
  } catch (e) {
    if (e.message === "VALIDATION_TCKN")
      return res.status(400).json({ msg: "TCKN 11 hane olmalı" });
    if (e.message === "DUPLICATE_TCKN")
      return res.status(409).json({ msg: "Bu TCKN/VKN zaten kayıtlı" });
    if (e.message === "BRANCH_REQUIRED")
      return res.status(400).json({ msg: "Şube seçimi zorunlu" });
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}

export async function getSummaryHandler(req, res) {
  try {
    const nationalId = String(req.query.national_id || "");
    if (!/^\d{11}$/.test(nationalId))
      return res.status(400).json({ msg: "national_id 11 hane olmalı" });
    const s = await getSummary(nationalId);
    if (!s) return res.sendStatus(404);
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}

export async function listByBranchHandler(req, res) {
  try {
    const {
      branch_id = null,
      account_type = null,
      currency_code = null,
      q = null,
      limit = 20,
      offset = 0,
    } = req.query;

    const data = await CustomerRepo.listByBranchWithAccounts({
      branch_id: branch_id ? Number(branch_id) : null,
      account_type: account_type || null,
      currency_code: currency_code || null,
      q: q || null,
      limit,
      offset,
    });

    const { items, total } = await CustomerRepo.listByBranchWithAccountsPaged({
      branch_id: branch_id ? Number(branch_id) : null,
      account_type: account_type || null,
      currency_code: currency_code || null,
      q: q || null,
      limit: Number(limit),
      offset: Number(offset),
    });

    return res.json({
      items,
      total, // ⇠ MUI TablePagination için gerekli
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}
