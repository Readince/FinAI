import { CustomerRepo } from "../repositories/customerRepo.js";
import { AccountRepo } from "../repositories/accountRepo.js";

const isTCKN = v => /^\d{11}$/.test(String(v || ""));

export async function createCustomer(dto) {
  if (!isTCKN(dto.national_id)) throw new Error("VALIDATION_TCKN");

  const exists = await CustomerRepo.findByNationalId(dto.national_id);
  if (exists) throw new Error("DUPLICATE_TCKN");

  return CustomerRepo.create(dto);
}

export async function getSummary(nationalId) {
  const c = await CustomerRepo.findByNationalId(nationalId);
  if (!c) return null;
  const accounts = await AccountRepo.listByCustomerId(c.id);
  return { customer: c, accounts };
}
