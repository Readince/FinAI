import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  function onGo(e) {
    e.preventDefault();
    const value = document.getElementById("operation")?.value;
    if (value) navigate(value);
  }

  function logout() {
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 720 }}>
        <header style={{ marginBottom: 12 }}>
          <h1>Panel</h1>
          <p className="sub">Lütfen bir işlem seçiniz.</p>
        </header>

        <form id="op-form" className="toolbar">
          <label htmlFor="operation" className="toolbar__label">İşlem seçiniz</label>
          <select id="operation" name="operation" className="toolbar__select" defaultValue="">
            <option value="" disabled>— Seçin —</option>
            <option value="/yeni-musteri">Yeni Müşteri Kaydı</option>
            <option value="/hesap-islemleri">Hesap İşlemleri</option>
            <option value="/musteri-sorgu">Müşteri Bilgi Sorgulama</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={onGo}>Git</button>
        </form>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={logout}>Çıkış Yap</button>
        </div>
      </div>
    </div>
  );
}
