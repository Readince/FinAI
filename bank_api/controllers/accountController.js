// controllers/accountController.js
import { openAccount } from '../services/accountService.js';

export async function postAccount(req, res) {
  try {
    const account = await openAccount(req.body);
    return res.status(201).json({ account });
  } catch (e) {
    if (e.message === 'NOT_FOUND_CUSTOMER') {
      return res.status(404).json({ msg: 'Müşteri bulunamadı' });
    }
    if (e.message === 'VALIDATION_ERROR') {
      return res.status(400).json({ msg: 'Geçersiz hesap verisi' });
    }
    console.error(e);
    return res.status(500).json({ msg: 'DB error' });
  }
}

