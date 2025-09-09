import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import Dashboard from "./Dashboard";
import YeniMusteri from "./YeniMusteri";
import HesapIslemleri from "./HesapIslemleri";
import MusteriBilgiSorgulama from "./MusteriBilgiSorgulama";
import { useEffect } from "react";
import type React from "react";
import { scheduleLogout } from "./authTimer";
import HesapKapatma from ".//HesapKapatma";
import SubeMusteriListesi from "./SubeMusteriListesi";

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload)) as { exp: number };
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("auth_token");
  if (!isTokenValid(token)) {
    localStorage.removeItem("auth_token");
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (isTokenValid(token) && token) {
      scheduleLogout(token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/yeni-musteri"
          element={
            <RequireAuth>
              <YeniMusteri />
            </RequireAuth>
          }
        />
        <Route
          path="/hesap-islemleri"
          element={
            <RequireAuth>
              <HesapIslemleri />
            </RequireAuth>
          }
        />
        <Route
          path="/musteri-sorgu"
          element={
            <RequireAuth>
              <MusteriBilgiSorgulama />
            </RequireAuth>
          }
        />
        <Route
          path="/hesap-kapatma"
          element={
            <RequireAuth>
              <HesapKapatma />
            </RequireAuth>
          }
        />
        <Route
          path="/sube-musteri-listesi"
          element={
            <RequireAuth>
              <SubeMusteriListesi />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
