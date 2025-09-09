// services/ai/dbTools.js
import { maskTc, maskPhone } from "../../utils/mask.js";
import { AccountRepo } from "../../repositories/accountRepo.js";
import { CustomerRepo } from "../../repositories/customerRepo.js"; // Büyük C!

// Eğer redis kullanacaksan aç:
// import redis from "../../utils/redis.js";
// const cacheGet = (k) => redis.get(k).then(v => (v ? JSON.parse(v) : null));
// const cacheSet = (k, v, ttl = 180) => redis.setEx(k, ttl, JSON.stringify(v));

function mapCustomerRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
    email: row.email,
    phone_masked: maskPhone(row.phone),
    national_id_masked: maskTc(row.national_id),
    birth_date: row.birth_date,
    gender: row.gender,
    nationality: row.nationality,
    branch_id: row.branch_id,
    created_at: row.created_at,
  };
}

export async function runToolCall(name, args) {
  try {
    switch (name) {
      /* -------------------------------------------------------- */
      /* find_customer                                            */
      /* -------------------------------------------------------- */
      case "find_customer": {
        const { id, national_id, email, phone, name, limit = 10 } = args || {};
        let rows = [];

        if (id != null) {
          const r = await CustomerRepo.findById(Number(id));
          rows = r ? [r] : [];
        } else if (national_id) {
          const normTc = String(national_id || "").replace(/\D/g, "");
          if (!/^\d{11}$/.test(normTc)) return [];
          // const cacheKey = `cust:tckn:${normTc}`; // redis
          // const cached = await cacheGet(cacheKey); if (cached) return cached;
          const r = await CustomerRepo.findByNationalId(normTc); // tek kayıt döner
          rows = r ? [r] : [];
          // if (rows.length) await cacheSet(cacheKey, rows);
        } else if (email) {
          rows = await CustomerRepo.findByEmail(
            String(email).trim().toLowerCase(),
            limit
          );
        } else if (phone) {
          rows = await CustomerRepo.findByPhone(String(phone).trim(), limit);
        } else if (name) {
          rows = await CustomerRepo.findByName(String(name).trim(), limit);
        }

        return (rows || []).map(mapCustomerRow).filter(Boolean);
      }

      /* -------------------------------------------------------- */
      /* list_accounts_by_customer                                */
      /* -------------------------------------------------------- */
      case "list_accounts_by_customer": {
        const customerId = Number(args?.customer_id);
        if (!customerId) return [];
        const status = args?.status ? String(args.status).toUpperCase() : null;
        const rows = await AccountRepo.listByCustomerId(customerId);
        return status ? rows.filter((r) => r.status === status) : rows;
      }

      /* -------------------------------------------------------- */
      /* account_overview                                         */
      /* -------------------------------------------------------- */
      case "account_overview": {
        const r = await AccountRepo.getAccountOverview({
          account_id: args?.account_id != null ? Number(args.account_id) : null,
          account_no: args?.account_no ?? null,
        });
        if (!r) return null;

        return {
          id: r.id,
          account_no: r.account_no,
          currency_code: r.currency_code,
          account_type: r.account_type,
          balance: r.balance,
          interest_rate: r.interest_rate,
          sub_no: r.sub_no,
          status: r.status,
          created_at: r.created_at,
          branch: {
            id: r.resolved_branch_id,
            code: r.branch_code,
            name: r.branch_name,
            city: r.branch_city,
            district: r.branch_district,
          },
          customer: {
            id: r.customer_id,
            full_name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
            email: r.email,
            phone_masked: maskPhone(r.phone),
            national_id_masked: maskTc(r.national_id),
          },
        };
      }

      /* -------------------------------------------------------- */
      /* branch_summary                                           */
      /* -------------------------------------------------------- */
      case "branch_summary": {
        return await AccountRepo.getBranchSummary({
          branch_id: args?.branch_id != null ? Number(args.branch_id) : null,
          branch_code:
            args?.branch_code != null ? Number(args.branch_code) : null,
        });
      }

      /* -------------------------------------------------------- */
      /* NEW: find_customer_and_accounts                          */
      /* -------------------------------------------------------- */
      case "find_customer_and_accounts": {
        const { id, national_id, status, max_accounts = 20 } = args || {};
        let cust = null;

        if (id != null) {
          cust = await CustomerRepo.findById(Number(id));
        } else if (national_id) {
          const normTc = String(national_id || "").replace(/\D/g, "");
          if (!/^\d{11}$/.test(normTc)) return null;
          // const cacheKey = `cust+acc:tckn:${normTc}`; // redis
          // const cached = await cacheGet(cacheKey); if (cached) return cached;
          cust = await CustomerRepo.findByNationalId(normTc);
          // cache set'i aşağıda payload ile birlikte yaparız
        }

        if (!cust) return null;

        const accountsAll = await AccountRepo.listByCustomerId(cust.id);
        const filtered = status
          ? accountsAll.filter((a) => a.status === String(status).toUpperCase())
          : accountsAll;

        const payload = {
          customer: mapCustomerRow(cust),
          accounts: filtered.slice(
            0,
            Math.max(1, Math.min(100, Number(max_accounts) || 20))
          ),
        };

        // if (national_id) await cacheSet(`cust+acc:tckn:${String(national_id).replace(/\D/g,"")}`, payload);
        return payload;
      }

      default:
        return { error: "unknown_tool" };
    }
  } catch (err) {
    console.error("[runToolCall] error:", err);
    return { error: "tool_runtime_error", detail: err?.message || String(err) };
  }
}
