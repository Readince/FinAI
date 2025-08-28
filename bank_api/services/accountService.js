import  db  from '../utils/db.js';
import { CustomerRepo } from '../repositories/customerRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';

function makeAccountNo(customerId, subNo) {
  return `TR01-0001-${customerId}-${subNo || 0}`;
}

export async function openAccount(input) {
  const { national_id, currency_code, account_type, balance, interest_rate, sub_no } = input;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const customer = await CustomerRepo.findByNationalId(national_id);
    if (!customer) throw new Error('NOT_FOUND_CUSTOMER');

    const account_no = makeAccountNo(customer.id, sub_no);

    const created = await AccountRepo.create({
      customer_id: customer.id,
      currency_code,
      account_type,
      balance,
      interest_rate,
      sub_no,
      account_no
    });

    await client.query('COMMIT');
    return created;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
