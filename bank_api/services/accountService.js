import db from '../utils/db.js';
import { CustomerRepo } from '../repositories/customerRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';

export async function openAccount(input) {
  const {
    national_id,
    currency_code,
    account_type,
  } = input;

  // Varsayılanlar ve iş kuralı
  let balance = input.balance ?? 0;
  let interest_rate = input.interest_rate ?? 0;
  const sub_no = input.sub_no ?? null; // verildiyse kullan, yoksa trigger atar

  if (account_type === 'VADESIZ') {
    interest_rate = 0; // vadesizde faiz 0
  }

  const client = await db.getClient(); // <-- db.connect() değil
  try {
    await client.query('BEGIN');

    // Müşteriyi transaction içinden bul (aynı client)
    const customer = await (async () => {
      // Repo'yu client'lı kullanmak ideal; eğer repo bunu desteklemiyorsa doğrudan client.query ile çek
      const { rows } = await client.query(
        'SELECT id FROM customers WHERE national_id=$1',
        [national_id]
      );
      return rows[0];
    })();

    if (!customer) throw new Error('NOT_FOUND_CUSTOMER');

    // account_no ve sub_no'yu DB'ye bırak: trigger otomatik üretsin
    const created = await AccountRepo.create(
      {
        customer_id: customer.id,
        currency_code,
        account_type,
        balance,
        interest_rate,
        account_no: null,   // NULL -> trigger üretir (eğer eklediysen)
        sub_no,             // NULL -> trigger 1,2,3... verir
      },
      client // <-- transaction içinde çalış
    );

    await client.query('COMMIT');
    return created; // repo RETURNING sub_no_str vs. döndürüyorsa burada gelir
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
