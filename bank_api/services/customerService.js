// services/customerService.js
import db from "../utils/db.js";
import { CustomerRepo } from "../repositories/customerRepo.js";
import { AccountRepo } from "../repositories/accountRepo.js";

const isTCKN = (v) => /^\d{11}$/.test(String(v || ""));

export async function createCustomer(dto, { openDefault = false } = {}) {
  if (!isTCKN(dto.national_id)) throw new Error("VALIDATION_TCKN");

  const exists = await CustomerRepo.findByNationalId(dto.national_id);
  if (exists) throw new Error("DUPLICATE_TCKN");

  // transaction
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const customer = await CustomerRepo.create(dto, client);

    let default_account = null;
    if (openDefault) {
      default_account = await AccountRepo.create(
        {
          customer_id: customer.id,
          currency_code: "TRY",
          account_type: "VADESIZ",
          balance: 0,
          interest_rate: 0,
          // account_no, sub_no -> NULL bırak: trigger otomatik atar
        },
        client
      );
    }

    await client.query("COMMIT");
    return { customer, default_account };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getSummary(nationalId) {
  const c = await CustomerRepo.findByNationalId(nationalId);
  if (!c) return null;
  const accounts = await AccountRepo.listByCustomerId(c.id);
  return { customer: c, accounts };
}
