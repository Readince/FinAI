
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import Dashboard from "./Dashboard";
import "./AuthPage.css";
import "./Dashboard.css";
import YeniMusteri from "./YeniMusteri";
import HesapIslemleri from "./HesapIslemleri";
import MusteriBilgiSorgulama from "./MusteriBilgiSorgulama";
import type React from "react";


// Giriş kontrolü
function RequireAuth({ children }:{children:React.ReactNode}) {
  const authed = localStorage.getItem("auth") === "true";
  return authed ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/yeni-musteri" element={<RequireAuth><YeniMusteri /></RequireAuth>} />
        <Route path="/hesap-islemleri" element={<RequireAuth><HesapIslemleri /></RequireAuth>} />
        <Route path="/musteri-sorgu" element={<RequireAuth><MusteriBilgiSorgulama /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}



