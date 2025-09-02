// controllers/customerController.js
import { createCustomer, getSummary } from "../services/customerService.js";

export async function postCustomer(req, res) {
  try {
    // body'den open_default_account'ı al ve servise opsiyon olarak geçir
    const { open_default_account, ...dto } = req.body;

    const { customer, default_account } = await createCustomer(dto, {
      openDefault: !!open_default_account,
    });

    // 201 + hem müşteri hem de (varsa) default hesap bilgisini döndür
    return res.status(201).json({
      customer,
      default_account, // open_default_account=false ise null olabilir
    });
  } catch (e) {
    if (e.message === "VALIDATION_TCKN") {
      return res.status(400).json({ msg: "TCKN 11 hane olmalı" });
    }
    if (e.message === "DUPLICATE_TCKN") {
      return res.status(409).json({ msg: "Bu TCKN/VKN zaten kayıtlı" });
    }
    if (e.message === "BRANCH_REQUIRED") {
      return res.status(400).json({ msg: "Şube seçimi zorunlu" });
    }
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}

export async function getSummaryHandler(req, res) {
  try {
    const nationalId = String(req.query.national_id || "");
    if (!/^\d{11}$/.test(nationalId)) {
      return res.status(400).json({ msg: "national_id 11 hane olmalı" });
    }
    const s = await getSummary(nationalId);
    if (!s) return res.sendStatus(404);
    return res.json(s);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}

