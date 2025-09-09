// services/accountService.js
import db from "../utils/db.js";
import { AccountRepo } from "../repositories/accountRepo.js";
import { CustomerRepo } from "../repositories/customerRepo.js";

/** HESAP AÇMA */
export async function openAccount(input) {
  let {
    national_id,
    currency_code,
    account_type,
    balance,
    interest_rate,
    sub_no,
  } = input;

  // normalize + kurallar
  national_id = String(national_id || "").trim();
  currency_code = String(currency_code || "").toUpperCase();
  account_type = String(account_type || "").toUpperCase();
  balance = Number(balance ?? 0);
  interest_rate = Number(interest_rate ?? 0);
  sub_no = sub_no ?? null;

  if (!/^\d{11}$/.test(national_id)) throw new Error("VALIDATION_TCKN");
  if (!["VADESIZ", "VADELI"].includes(account_type))
    throw new Error("VALIDATION_TYPE");
  if (!currency_code || currency_code.length !== 3)
    throw new Error("VALIDATION_CCY");
  if (balance < 0) throw new Error("VALIDATION_BALANCE");
  if (account_type === "VADESIZ") interest_rate = 0;
  if (interest_rate < 0 || interest_rate > 50)
    throw new Error("VALIDATION_INTEREST");

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const { rows: custRows } = await client.query(
      `SELECT id, branch_id FROM customers WHERE national_id=$1`,
      [national_id]
    );
    const customer = custRows[0];
    if (!customer) throw new Error("NOT_FOUND_CUSTOMER");

    const created = await AccountRepo.create(
      {
        customer_id: customer.id,
        currency_code,
        account_type,
        balance,
        interest_rate,
        account_no: null, // trigger üretir
        sub_no, // null ise trigger verir
      },
      client
    );

    // accounts.branch_id kolonun varsa müşterinin şubesini hesaba yaz
    if (customer.branch_id) {
      await client.query(`UPDATE accounts SET branch_id=$1 WHERE id=$2`, [
        customer.branch_id,
        created.id,
      ]);
      created.branch_id = customer.branch_id;
    }

    await client.query("COMMIT");
    return created;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** HESAP KAPATMA */
export async function closeAccountService({
  accountId,
  payoutMethod,
  targetAccountId,
}) {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const acc = await AccountRepo.findByIdForUpdate(accountId, client);
    if (!acc) throw new Error("ACCOUNT_NOT_FOUND");
    if (acc.status !== "ACTIVE") throw new Error("ACCOUNT_ALREADY_CLOSED");

    const balance = Number(acc.balance) || 0;

    if (balance === 0) {
      const closed = await AccountRepo.closeSetZero(accountId, client);
      const customer = await CustomerRepo.findById(acc.customer_id);
      await client.query("COMMIT");
      return {
        closed_account: {
          id: closed.id,
          account_no: closed.account_no,
          currency_code: closed.currency_code,
        },
        payout: { method: "CASH", amount: 0 },
        customer: {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          national_id: customer.national_id,
        },
      };
    }

    if (!payoutMethod) throw new Error("TRANSFER_TARGET_REQUIRED");

    if (payoutMethod === "CASH") {
      const closed = await AccountRepo.closeAndZero(accountId, client);
      const customer = await CustomerRepo.findById(acc.customer_id);
      await client.query("COMMIT");
      return {
        closed_account: {
          id: closed.id,
          account_no: closed.account_no,
          currency_code: closed.currency_code,
        },
        payout: { method: "CASH", amount: balance },
        customer: {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          national_id: customer.national_id,
        },
      };
    }

    if (payoutMethod === "TRANSFER") {
      if (!targetAccountId) throw new Error("TRANSFER_TARGET_REQUIRED");
      const target = await AccountRepo.findByIdForUpdate(
        Number(targetAccountId),
        client
      );
      if (!target) throw new Error("TRANSFER_TARGET_NOT_FOUND");
      if (target.id === acc.id) throw new Error("TRANSFER_TARGET_INVALID");
      if (target.customer_id !== acc.customer_id)
        throw new Error("TRANSFER_TARGET_INVALID");
      if (target.status !== "ACTIVE")
        throw new Error("TRANSFER_TARGET_INVALID");
      if (target.account_type !== "VADESIZ")
        throw new Error("TRANSFER_TARGET_INVALID");
      if (target.currency_code !== acc.currency_code)
        throw new Error("CURRENCY_MISMATCH");

      await AccountRepo.addBalance(target.id, balance, client);
      const closed = await AccountRepo.closeAndZero(accountId, client);

      const customer = await CustomerRepo.findById(acc.customer_id);
      await client.query("COMMIT");
      return {
        closed_account: {
          id: closed.id,
          account_no: closed.account_no,
          currency_code: closed.currency_code,
        },
        payout: {
          method: "TRANSFER",
          amount: balance,
          target_account: {
            id: target.id,
            account_no: target.account_no,
            currency_code: target.currency_code,
          },
        },
        customer: {
          id: customer.id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          national_id: customer.national_id,
        },
      };
    }

    throw new Error("TRANSFER_TARGET_REQUIRED");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
