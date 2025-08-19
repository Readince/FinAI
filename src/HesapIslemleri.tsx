import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css"; // mevcut stilleri kullanıyoruz

export default function HesapIslemleri() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tckn: "",
    doviz: "TRY",
    bakiye: "",
    hesapTipi: "vadesiz",
    faiz: "0",
    ekNo: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    let v = value;
    if (name === "tckn") v = value.replace(/\D/g, "").slice(0, 11);
    if (name === "bakiye") v = v.replace(",", ".");
    if (name === "faiz") v = v.replace(",", ".");
    if (name === "ekNo") v = value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, [name]: v }));
    setMessage("");
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const e = {};
    if (!/^\d{11}$/.test(form.tckn)) e.tckn = "TCKN/VKN 11 haneli olmalı";
    if (!form.doviz) e.doviz = "Döviz kodu seçiniz";
    if (form.bakiye === "" || isNaN(Number(form.bakiye)) || Number(form.bakiye) < 0) e.bakiye = "Geçerli bir bakiye giriniz";
    if (!form.hesapTipi) e.hesapTipi = "Hesap tipi seçiniz";
    const faizNum = Number(form.faiz);
    if (isNaN(faizNum) || faizNum < 0 || faizNum > 100) e.faiz = "Faiz %0–100 arası olmalı";
    if (!form.ekNo || form.ekNo.length < 1) e.ekNo = "Hesap ek no giriniz";
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }

    // DEMO: Şimdilik sadece başarı mesajı. Sonra API: POST /api/accounts
    await new Promise((r) => setTimeout(r, 500));
    setMessage("Hesap başarıyla oluşturuldu (demo).");

    // formu temizle (döviz ve hesap tipi aynı kalsın isterseniz bu satırı düzenleyebilirsiniz)
    setForm({ tckn: "", doviz: form.doviz, bakiye: "", hesapTipi: form.hesapTipi, faiz: form.faiz, ekNo: "" });
  }

  function logout(){
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1>Hesap Oluştur</h1>
            <p className="sub">Gerekli alanları doldurup hesabı oluşturun.</p>
          </div>
          <button className="btn btn-ghost" onClick={logout}>Çıkış Yap</button>
        </div>

        <form onSubmit={onSubmit} className="stack" style={{ gap: 12 }}>
          <div className="grid-2">
            <div className="stack">
              <label className="muted" htmlFor="tckn">TCKN / VKN (11 hane)</label>
              <input id="tckn" name="tckn" className={`input ${errors.tckn ? "input--error" : ""}`} value={form.tckn} onChange={onChange} placeholder="12345678901" />
              {errors.tckn && <small className="help">{errors.tckn}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="doviz">Döviz Kodu</label>
              <select id="doviz" name="doviz" className={`input ${errors.doviz ? "input--error" : ""}`} value={form.doviz} onChange={onChange}>
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              {errors.doviz && <small className="help">{errors.doviz}</small>}
            </div>
          </div>

          <div className="grid-2">
            <div className="stack">
              <label className="muted" htmlFor="bakiye">Bakiye Tutarı</label>
              <input id="bakiye" name="bakiye" className={`input ${errors.bakiye ? "input--error" : ""}`} value={form.bakiye} onChange={onChange} placeholder="0.00" inputMode="decimal" />
              {errors.bakiye && <small className="help">{errors.bakiye}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="hesapTipi">Hesap Tipi</label>
              <select id="hesapTipi" name="hesapTipi" className={`input ${errors.hesapTipi ? "input--error" : ""}`} value={form.hesapTipi} onChange={onChange}>
                <option value="vadesiz">Vadesiz</option>
                <option value="vadeli">Vadeli</option>
              </select>
              {errors.hesapTipi && <small className="help">{errors.hesapTipi}</small>}
            </div>
          </div>

          <div className="grid-2">
            <div className="stack">
              <label className="muted" htmlFor="faiz">Faiz Oranı (%)</label>
              <input id="faiz" name="faiz" className={`input ${errors.faiz ? "input--error" : ""}`} value={form.faiz} onChange={onChange} placeholder="0" inputMode="decimal" />
              {errors.faiz && <small className="help">{errors.faiz}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="ekNo">Hesap Ek No</label>
              <input id="ekNo" name="ekNo" className={`input ${errors.ekNo ? "input--error" : ""}`} value={form.ekNo} onChange={onChange} placeholder="Örn: 001" />
              {errors.ekNo && <small className="help">{errors.ekNo}</small>}
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 6 }}>
            <button type="submit" className="btn btn-success">Hesabı Oluştur</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Geri Dön</button>
          </div>

          {message && <div className="message">{message}</div>}
        </form>
      </div>
    </div>
  );
}
