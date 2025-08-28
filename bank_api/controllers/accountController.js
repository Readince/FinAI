import { openAccount } from '../services/accountService.js';

export async function postAccount(req, res) {
  try {
    const created = await openAccount(req.body);
    res.status(201).json(created);
  } catch (e) {
    if (e.message === 'NOT_FOUND_CUSTOMER') return res.status(404).json({ msg: 'Müşteri bulunamadı' });
    console.error(e); return res.status(500).json({ msg: 'DB error' });
  }
}
