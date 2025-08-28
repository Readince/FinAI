// Burayı mevcut kodundan import ederek doldur.
// Aşağıdaki yalın örnek: "Bearer <JWT>" doğrula ve req.user doldur.
export function auth(req, res, next) {
  // TODO: kendi JWT/Redis session kontrolünü burada çağır
  if (!req.headers.authorization) return res.sendStatus(401);
  // örn: const user = verifyJwt(...); if (!user) return res.sendStatus(401);
  req.user = { id: 'staff-123' };
  next();
}
