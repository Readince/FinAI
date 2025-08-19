import { useState } from "react";
import "./AuthPage.css";

function Button({ children, className = "", ...props }) {
  return (
    <button className={["btn", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  );
}

export default function AuthPage() {
  const [personelId, setPersonelId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onIdChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPersonelId(digitsOnly);
  };

  const isValidId = /^\d{11}$/.test(personelId);
  const isValidPass = password.length >= 6;
  const formValid = isValidId && isValidPass && !loading;

  const resetFeedback = () => setMessage("");

  async function handleSubmit(e, mode) {
    e.preventDefault();
    resetFeedback();
    if (!formValid) return;

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700)); // demo bekleme

      // Başarılı giriş/kayıt → auth işareti ve yönlendirme
      localStorage.setItem("auth", "true");
      window.location.href = "/dashboard";

      setMessage(
        mode === "login"
          ? "Giriş başarılı (demo)."
          : "Kayıt başarılı (demo)."
      );
    } catch (err) {
      setMessage(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <header>
          <h1>Personel Girişi</h1>
          <p className="sub">Personel ID <strong>11 hane</strong> olmalı.</p>
        </header>

        <form className="stack" style={{ gap: 12 }}>
          <div className="stack">
            <label htmlFor="personelId" className="muted">Personel ID</label>
            <input
              id="personelId"
              name="personelId"
              className={["input", !isValidId && personelId.length > 0 ? "input--error" : ""].join(" ")}
              inputMode="numeric"
              pattern="\\d{11}"
              title="11 haneli sadece rakam giriniz"
              value={personelId}
              onChange={onIdChange}
              onInput={resetFeedback}
              placeholder="Örn: 12345678901"
            />
            {!isValidId && personelId.length > 0 && (
              <p className="help">ID 11 haneli olmalı.</p>
            )}
          </div>

          <div className="stack">
            <label htmlFor="password" className="muted">Şifre</label>
            <div className="row">
              <input
                id="password"
                name="password"
                className="input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={resetFeedback}
                placeholder="En az 6 karakter"
              />
              <Button type="button" className="btn-ghost" onClick={() => setShowPass((s) => !s)}>
                {showPass ? "Gizle" : "Göster"}
              </Button>
            </div>
            {!isValidPass && password.length > 0 && (
              <p className="help">Şifre en az 6 karakter olmalı.</p>
            )}
          </div>

          <div className="grid-2" style={{ marginTop: 6 }}>
            <Button
              type="submit"
              className="btn-primary"
              disabled={!formValid}
              onClick={(e) => handleSubmit(e, "login")}
            >
              Giriş Yap
            </Button>
            <Button
              type="submit"
              className="btn-success"
              disabled={!formValid}
              onClick={(e) => handleSubmit(e, "signup")}
            >
              Kayıt Ol
            </Button>
          </div>

          {message && <div className="message">{message}</div>}
        </form>
      </div>
    </div>
  );
}



