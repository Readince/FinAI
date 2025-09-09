import "dotenv/config";
import { faker as fakerTR } from "@faker-js/faker/locale/tr";
import { faker as fakerEN } from "@faker-js/faker/locale/en";
import db from "../utils/db.js";

const BRANCH_IDS = [1, 2, 3, 4, 5]; // 1 = Merkez
const CUST_BATCH_SIZE = 200; // batch boyutu

// --- yardımcılar ---
const safe = (v, max) => String(v ?? "").slice(0, max);
const fmtDate = (d) =>
  d instanceof Date
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    : null;

// --- TCKN üretim (resmi kurallar) ---
function generateValidTCKN() {
  const d = new Array(11).fill(0);
  d[0] = fakerTR.number.int({ min: 1, max: 9 }); // D1 ≠ 0
  for (let i = 1; i <= 8; i++) d[i] = fakerTR.number.int({ min: 0, max: 9 });

  const sumOdd = d[0] + d[2] + d[4] + d[6] + d[8]; // 1,3,5,7,9
  const sumEven = d[1] + d[3] + d[5] + d[7]; // 2,4,6,8
  d[9] = (sumOdd * 7 - sumEven) % 10; // D10
  if (d[9] < 0) d[9] += 10; // negatif mod düzelt
  const sumFirst10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  d[10] = sumFirst10 % 10; // D11
  return d.join("");
}

// benzersiz TCKN & hesap no
const usedTckn = new Set();
function randTckn() {
  let t;
  do {
    t = generateValidTCKN();
  } while (usedTckn.has(t));
  usedTckn.add(t);
  return t;
}

const usedAcct = new Set();
function randAccountNo() {
  let acc;
  do {
    acc = fakerTR.string.numeric(10);
  } while (usedAcct.has(acc));
  usedAcct.add(acc);
  return acc;
}

async function seedCustomers(total = 1000) {
  console.time("seed");
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // İsteğe bağlı temiz başlangıç:
    await client.query("TRUNCATE accounts RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE customers RESTART IDENTITY CASCADE");

    for (let start = 0; start < total; start += CUST_BATCH_SIZE) {
      const end = Math.min(start + CUST_BATCH_SIZE, total);

      // ---------- MÜŞTERİLER ----------
      const custValues = [];
      const custParams = [];
      let p = 1;

      for (let i = start; i < end; i++) {
        const branchId = fakerTR.helpers.arrayElement(BRANCH_IDS);
        const first_name = safe(fakerTR.person.firstName(), 50);
        const last_name = safe(fakerTR.person.lastName(), 50);
        const national_id = randTckn();

        // Kişisel bilgiler
        const birth_date = fmtDate(
          fakerTR.date.birthdate({ min: 18, max: 80, mode: "age" })
        ); // DATE -> 'YYYY-MM-DD'
        const gender = fakerTR.helpers.arrayElement(["E", "K"]); // Erkek/Kadın
        const nationality = fakerTR.helpers.arrayElement(["TR", "YABANCI"]); // Uyruk
        const mother_name = safe(fakerTR.person.firstName("female"), 50);
        const father_name = safe(fakerTR.person.firstName("male"), 50);

        // İletişim
        const phone = safe(fakerTR.phone.number("05#########"), 20); // 11 hane TR cep
        const email = safe(
          fakerEN.internet.email({
            firstName: first_name,
            lastName: last_name,
          }),
          100
        ); // EN fallback
        const address = safe(fakerTR.location.streetAddress(), 255);

        custValues.push(
          `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`
        );
        custParams.push(
          national_id,
          first_name,
          last_name,
          phone,
          email,
          address,
          branchId,
          birth_date,
          gender,
          nationality,
          mother_name,
          father_name
        );
      }

      const custInsert = `
        INSERT INTO customers
          (national_id, first_name, last_name, phone, email, address, branch_id,
           birth_date, gender, nationality, mother_name, father_name)
        VALUES ${custValues.join(",")}
        RETURNING id, branch_id
      `;
      const { rows: insertedCustomers } = await client.query(
        custInsert,
        custParams
      );

      // ---------- HESAPLAR ----------
      const accValues = [];
      const accParams = [];
      p = 1;

      for (const c of insertedCustomers) {
        const accountCount = fakerTR.number.int({ min: 1, max: 3 });
        for (let j = 0; j < accountCount; j++) {
          const currency = fakerTR.helpers.arrayElement(["TRY", "USD", "EUR"]);
          const type = fakerTR.helpers.arrayElement(["VADESIZ", "VADELI"]);
          const balance = Number(
            fakerTR.finance.amount({ min: 0, max: 100000, dec: 2 })
          );
          const interest = fakerTR.number.int({ min: 0, max: 20 });
          const accountNo = randAccountNo();

          // sub_no GÖNDERMİYORUZ → trigger (trg_accounts_fill_fields) kendisi dolduracak
          accValues.push(
            `($${p++},$${p++},$${p++},$${p++},$${p++},'ACTIVE',$${p++},$${p++})`
          );
          accParams.push(
            c.id,
            currency,
            type,
            balance,
            interest,
            accountNo,
            c.branch_id
          );
        }
      }

      if (accValues.length) {
        const accInsert = `
          INSERT INTO accounts
            (customer_id, currency_code, account_type, balance, interest_rate, status, account_no, branch_id)
          VALUES ${accValues.join(",")}
        `;
        await client.query(accInsert, accParams);
      }

      console.log(`✔︎ ${end}/${total} müşteri işlendi`);
    }

    await client.query("COMMIT");
    console.timeEnd("seed");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("SEED ERROR", err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

// CLI: node scripts/seed.js 1200  |  npm run seed
const total = Number(process.argv[2] || 1000);
seedCustomers(total);
