export const maskTc = (tc) =>
  typeof tc === "string"
    ? tc.replace(
        /^(\d{0,9})(\d{2})$/,
        (_m, a, b) => `${"*".repeat(a.length)}${b}`
      )
    : tc;

export const maskPhone = (p) =>
  typeof p === "string"
    ? p.replace(/(\d{3})(\d{0,})$/, (_m, a) => `${a} *** ** **`)
    : p;

export const maskCard = (s) => {
  if (!s) return s;
  // 13–19 haneli kart numarası gibi dizileri yakala (boşluk/tire toleranslı)
  return s.replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const digits = m.replace(/[^\d]/g, "");
    if (digits.length < 13 || digits.length > 19) return m;
    const first6 = digits.slice(0, 6);
    const last4 = digits.slice(-4);
    const masked = first6 + "*".repeat(digits.length - 10) + last4;
    // eski spacing’i korumaya uğraşmadan düz dön
    return masked;
  });
};

export const sanitizePIIText = (text) => {
  if (!text) return text;

  // TCKN: 11 hane
  text = text.replace(
    /\b(\d{2})\d{7}(\d{2})\b/g,
    (_, a, b) => `${a}${"*".repeat(7)}${b}`
  );

  // Türkiye cep: +90 5xxxxxxxxx / 05xxxxxxxxx (mask basitleştirilmiş)
  text = text
    .replace(/\+90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g, (m) =>
      m.replace(/\d/g, "*")
    )
    .replace(/\b0?5\d{9}\b/g, (m) => m.slice(0, 3) + "******" + m.slice(-2));

  // IBAN TR
  text = text.replace(/\bTR\d{2}\s?\d{4}(?:\s?\d{4}){3,}\b/gi, (m) => {
    const compact = m.replace(/\s+/g, "");
    const head = compact.slice(0, 6);
    const tail = compact.slice(-4);
    return head + "*".repeat(compact.length - 10) + tail;
  });

  // Kart no
  text = maskCard(text);

  return text;
};
