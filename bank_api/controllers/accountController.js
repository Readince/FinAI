import {
  openAccount,
  closeAccountService,
} from "../services/accountService.js";

export async function postAccount(req, res) {
  try {
    const account = await openAccount(req.body);
    return res.status(201).json({ account });
  } catch (e) {
    if (e.message === "NOT_FOUND_CUSTOMER") {
      return res.status(404).json({ msg: "Müşteri bulunamadı" });
    }
    if (e.message === "VALIDATION_ERROR") {
      return res.status(400).json({ msg: "Geçersiz hesap verisi" });
    }
    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}

// ✅ Ayrı export edilen fonksiyon
export async function closeAccount(req, res) {
  try {
    const id = Number(req.params.id);
    const { payout_method, target_account_id } = req.body || {};

    const result = await closeAccountService({
      accountId: id,
      payoutMethod: payout_method, // "CASH" | "TRANSFER"
      targetAccountId: target_account_id, // number | undefined
    });

    return res.json(result);
  } catch (e) {
    const map = {
      ACCOUNT_NOT_FOUND: 404,
      ACCOUNT_ALREADY_CLOSED: 409,
      NEGATIVE_BALANCE: 400,
      TRANSFER_TARGET_REQUIRED: 400,
      TRANSFER_TARGET_NOT_FOUND: 404,
      TRANSFER_TARGET_INVALID: 400,
      CURRENCY_MISMATCH: 400,
    };
    const code = map[e.message];
    if (code) return res.status(code).json({ msg: e.message });

    console.error(e);
    return res.status(500).json({ msg: "DB error" });
  }
}
