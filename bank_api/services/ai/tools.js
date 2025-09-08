// services/ai/tools.js
export const tools = [
  {
    type: "function",
    function: {
      name: "find_customer",
      description: "Müşteriyi id, TCKN, ad/soyad, e-posta veya telefon ile bulur. TCKN ve telefon girişlerini maskelenmiş döndür.",
      parameters: {
        type: "object",
        properties: {
          id: { oneOf: [{ type: "integer" }, { type: "string" }], description: "customers.id" },
          national_id: { type: "string", pattern: "^\\d{11}$", description: "11 haneli T.C. Kimlik No (sadece rakam)" },
          name: { type: "string", minLength: 2, description: "Ad veya soyad (ILIKE arama)" },
          email: { type: "string", format: "email", description: "E-posta" },
          phone: { type: "string", pattern: "^\\+?\\d{10,15}$", description: "Örn: 05XXXXXXXXX veya +90..." },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 10 }
        },
        anyOf: [
          { required: ["id"] },
          { required: ["national_id"] },
          { required: ["name"] },
          { required: ["email"] },
          { required: ["phone"] }
        ],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "list_accounts_by_customer",
      description: "Bir müşterinin hesaplarını listeler.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { oneOf: [{ type: "integer" }, { type: "string" }], description: "customers.id" },
          status: { type: "string", enum: ["ACTIVE", "CLOSED"], description: "Opsiyonel durum filtresi" }
        },
        required: ["customer_id"],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "account_overview",
      description: "Hesap no veya hesap id ile hesap özetini getirir.",
      parameters: {
        type: "object",
        properties: {
          account_id: { oneOf: [{ type: "integer" }, { type: "string" }], description: "accounts.id" },
          account_no: { type: "string", description: "accounts.account_no" }
        },
        anyOf: [
          { required: ["account_id"] },
          { required: ["account_no"] }
        ],
        additionalProperties: false
      },
      strict: true
    }
  },

  {
    type: "function",
    function: {
      name: "branch_summary",
      description: "Şube kodu veya id ile temel şube bilgisini ve toplam hesap bakiyesini getirir.",
      parameters: {
        type: "object",
        properties: {
          branch_id: { oneOf: [{ type: "integer" }, { type: "string" }], description: "branches.id" },
          branch_code: { type: "integer", description: "branches.code" }
        },
        anyOf: [
          { required: ["branch_id"] },
          { required: ["branch_code"] }
        ],
        additionalProperties: false
      },
      strict: true
    }
  },

  // 🚀 Yeni: Tek çağrıda müşteri + hesaplar (LLM için daha hızlı & basit)
  {
    type: "function",
    function: {
      name: "find_customer_and_accounts",
      description: "Müşteriyi (id veya TCKN) bulur ve hesaplarını birlikte döner. UI/cevap için hızlı bir konsolide endpoint.",
      parameters: {
        type: "object",
        properties: {
          id: { oneOf: [{ type: "integer" }, { type: "string" }], description: "customers.id" },
          national_id: { type: "string", pattern: "^\\d{11}$", description: "11 haneli T.C. Kimlik No" },
          status: { type: "string", enum: ["ACTIVE", "CLOSED"], description: "Hesap durum filtresi (opsiyonel)" },
          max_accounts: { type: "integer", minimum: 1, maximum: 100, default: 20 }
        },
        anyOf: [
          { required: ["id"] },
          { required: ["national_id"] }
        ],
        additionalProperties: false
      },
      strict: true
    }
  }
];
