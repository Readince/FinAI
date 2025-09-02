// services/customerService.js
import db from "../utils/db.js";
import { CustomerRepo } from "../repositories/customerRepo.js";
import { AccountRepo } from "../repositories/accountRepo.js";

const isTCKN = (v) => /^\d{11}$/.test(String(v || ""));

// branch_code -> branch_id çevirici
async function resolveBranchId(dto, client) {
  // 1) branch_id geldiyse onu kullan
  if (dto.branch_id) return dto.branch_id;

  // 2) branch_code geldiyse DB’den id’yi bul
  if (dto.branch_code != null) {
    const { rows } = await (client || db).query(
      "SELECT id FROM public.branches WHERE code = $1 LIMIT 1",
      [dto.branch_code]
    );
    return rows[0]?.id || null;
  }

  // 3) hiçbir şey gelmediyse null döner
  return null;
}

/**
 * createCustomer(dto, { openDefault })
 * - dto.branch_id **veya** dto.branch_code zorunlu (müşteri bir şubeye ait olmalı)
 * - openDefault=true ise 0 TL vadesiz TRY hesabı otomatik açılır
 * - account_no, sub_no, branch_id hesap için trigger tarafından set edilir
 */
export async function createCustomer(dto, { openDefault = false } = {}) {
  if (!isTCKN(dto.national_id)) throw new Error("VALIDATION_TCKN");

  const exists = await CustomerRepo.findByNationalId(dto.national_id);
  if (exists) throw new Error("DUPLICATE_TCKN");

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // Şube zorunluluğu
    const branch_id = await resolveBranchId(dto, client);
    if (!branch_id) throw new Error("BRANCH_REQUIRED");

    // Müşteriyi oluştur (repo create branch_id’yi kabul ediyor)
    const customer = await CustomerRepo.create(
      { ...dto, branch_id },
      client
    );

    let default_account = null;
    if (openDefault) {
      // Hesap için branch_id gönderme → trigger müşteri.branch_id’den alır
      default_account = await AccountRepo.create(
        {
          customer_id: customer.id,
          currency_code: "TRY",
          account_type: "VADESIZ",
          balance: 0,
          interest_rate: 0,
          // account_no, sub_no, branch_id -> NULL bırak
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
  const accounts = await AccountRepo.listByCustomerId(c.id); // (JOIN ile branch_code dönüyorsa UI gösterir)
  return { customer: c, accounts };
}
