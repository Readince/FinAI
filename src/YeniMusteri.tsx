import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./YeniMusteri.css";

export default function YeniMusteri() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tckn: "",
    ad: "",
    soyad: "",
    dogum: "",
    cinsiyet: "",
    seriNo: "",
    uyruk: "",
    anneAdi: "",
    babaAdi: "",
    telefon: "",
    email: "",
    adres: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    let v = value;
    if (name === "tckn") v = value.replace(/\D/g, "").slice(0, 11); // sadece rakam ve 11 hane
    setForm((f) => ({ ...f, [name]: v }));
    setMessage("");
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const e = {};
    if (!/^\d{11}$/.test(form.tckn)) e.tckn = "TCKN/VKN 11 haneli olmalı";
    if (!form.ad.trim()) e.ad = "Ad gerekli";
    if (!form.soyad.trim()) e.soyad = "Soyad gerekli";
    if (!form.dogum) e.dogum = "Doğum tarihi gerekli";
    if (!form.cinsiyet) e.cinsiyet = "Cinsiyet seçiniz";
    if (!form.seriNo.trim()) e.seriNo = "Seri no gerekli";
    if (!form.uyruk) e.uyruk = "Uyruk seçiniz";
    if (!form.anneAdi.trim()) e.anneAdi = "Anne adı gerekli";
    if (!form.babaAdi.trim()) e.babaAdi = "Baba adı gerekli";
    if (!/^\+?\d[\d\s-]{7,}$/.test(form.telefon.trim())) e.telefon = "Geçerli bir telefon girin";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Geçerli bir e‑posta girin";
    if (!form.adres.trim()) e.adres = "Adres gerekli";
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }

    // DEMO: şimdilik sadece başarı mesajı.
    await new Promise((r) => setTimeout(r, 500));
    setMessage("Müşteri kaydı başarıyla oluşturuldu (demo).");
    // formu temizle
    setForm({ tckn:"", ad:"", soyad:"", dogum:"", cinsiyet:"", seriNo:"", uyruk:"", anneAdi:"", babaAdi:"", telefon:"", email:"", adres:"" });
  }

  function logout(){
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 820 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h1>Yeni Müşteri Kaydı</h1>
            <p className="sub">Lütfen müşteri bilgilerini eksiksiz giriniz.</p>
          </div>
          <button className="btn btn-ghost" onClick={logout}>Çıkış Yap</button>
        </div>

        <form onSubmit={onSubmit} className="stack-container" style={{ gap: 12 }}>
          {/* Kimlik */}
            <div className="stack">
              <label className="muted" htmlFor="tckn">TCKN / VKN (11 hane)</label>
              <input id="tckn" name="tckn" className={`input ${errors.tckn ? "input--error" : ""}`} value={form.tckn} onChange={onChange} placeholder="12345678901" />
              {errors.tckn && <small className="help">{errors.tckn}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="seriNo">Seri No</label>
              <input id="seriNo" name="seriNo" className={`input ${errors.seriNo ? "input--error" : ""}`} value={form.seriNo} onChange={onChange} placeholder="Örn: A12B34" />
              {errors.seriNo && <small className="help">{errors.seriNo}</small>}
            </div>

          {/* Ad Soyad */}
          <div className="stack">
              <label className="muted" htmlFor="ad">Ad</label>
              <input id="ad" name="ad" className={`input ${errors.ad ? "input--error" : ""}`} value={form.ad} onChange={onChange} placeholder="Ayşe" />
              {errors.ad && <small className="help">{errors.ad}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="soyad">Soyad</label>
              <input id="soyad" name="soyad" className={`input ${errors.soyad ? "input--error" : ""}`} value={form.soyad} onChange={onChange} placeholder="Yılmaz" />
              {errors.soyad && <small className="help">{errors.soyad}</small>}
          </div>

          {/* Doğum Tarihi, Cinsiyet, Uyruk */}
            <div className="stack">
              <label className="muted" htmlFor="telefon">Telefon</label>
              <input id="telefon" name="telefon" className={`input ${errors.telefon ? "input--error" : ""}`} value={form.telefon} onChange={onChange} placeholder="+90 5xx xxx xx xx" />
              {errors.telefon && <small className="help">{errors.telefon}</small>}
            </div>
             <div className="stack">
              <label className="muted" htmlFor="email">E‑posta</label>
              <input id="email" name="email" type="email" className={`input ${errors.email ? "input--error" : ""}`} value={form.email} onChange={onChange} placeholder="ornek@eposta.com" />
              {errors.email && <small className="help">{errors.email}</small>}
          </div>
            <div className="stack">
              <label className="muted" htmlFor="dogum">Doğum Tarihi</label>
              <input id="dogum" name="dogum" type="date" className={`input ${errors.dogum ? "input--error" : ""}`} value={form.dogum} onChange={onChange} />
              {errors.dogum && <small className="help">{errors.dogum}</small>}
              
           
          </div>

          <div className="grid-2">
            <div className="stack">
              <label className="muted">Cinsiyet</label>
              <div className="row">
                <label className="row" style={{ gap:6 }}>
                  <input type="radio" name="cinsiyet" value="erkek" checked={form.cinsiyet === "erkek"} onChange={onChange} /> Erkek
                </label>
                <label className="row" style={{ gap:6 }}>
                  <input type="radio" name="cinsiyet" value="kadin" checked={form.cinsiyet === "kadin"} onChange={onChange} /> Kadın
                </label>
              </div>
              {errors.cinsiyet && <small className="help">{errors.cinsiyet}</small>}
            </div>
            <div className="stack">
              <label className="muted">Uyruk</label>
              <div className="row">
                <label className="row" style={{ gap:6 }}>
                  <input type="radio" name="uyruk" value="turk" checked={form.uyruk === "turk"} onChange={onChange} /> Türk
                </label>
                <label className="row" style={{ gap:6 }}>
                  <input type="radio" name="uyruk" value="yabanci" checked={form.uyruk === "yabanci"} onChange={onChange} /> Yabancı
                </label>
              </div>
              {errors.uyruk && <small className="help">{errors.uyruk}</small>}
            </div>
            <div className="stack"></div>
            
          </div>

           

          {/* Anne/Baba Adı */}
        
            <div className="stack">
              <label className="muted" htmlFor="anneAdi">Anne Adı</label>
              <input id="anneAdi" name="anneAdi" className={`input ${errors.anneAdi ? "input--error" : ""}`} value={form.anneAdi} onChange={onChange} placeholder="Örn: Fatma" />
              {errors.anneAdi && <small className="help">{errors.anneAdi}</small>}
            </div>
            <div className="stack">
              <label className="muted" htmlFor="babaAdi">Baba Adı</label>
              <input id="babaAdi" name="babaAdi" className={`input ${errors.babaAdi ? "input--error" : ""}`} value={form.babaAdi} onChange={onChange} placeholder="Örn: Ahmet" />
              {errors.babaAdi && <small className="help">{errors.babaAdi}</small>}
          </div>

          {/* İletişim */}
          

          {/* Adres */}
          <div className="stack" style={{
            gridColumn: '1/span 2'
          }}>
            <label className="muted" htmlFor="adres">Adres</label>
            <textarea id="adres" name="adres" rows={3} className={`input ${errors.adres ? "input--error" : ""}`} value={form.adres} onChange={onChange} placeholder="Mahalle, cadde, no, il/ilçe" />
            {errors.adres && <small className="help">{errors.adres}</small>}
      
          </div>
            
           

          <div className="grid-2" style={{ marginTop: 6, gridColumn: '1/span 2' }}>
            <button type="submit" className="btn btn-success">Kaydı Oluştur</button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Geri Dön</button>
          </div>

          {message && <div className="message">{message}</div>}
        </form>
      </div>
    </div>
  );
}
