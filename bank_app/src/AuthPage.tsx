import { useState } from "react";
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Card,
  Typography,
  Box,
  Grid,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function AuthPage() {
  const [personelId, setPersonelId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const resetFeedback = () => setMessage("");

  const onIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPersonelId(digitsOnly);
  };

  const isValidId = /^\d{11}$/.test(personelId);
  const isValidPass = password.length >= 6;
  const formValid = isValidId && isValidPass && !loading;

  /** --------- SIGNUP --------- */
  async function handleSignup(e?: React.SyntheticEvent) {
    e?.preventDefault?.();
    resetFeedback();
    if (!formValid) {
      setMessage("Form geçersiz: 11 hane TCKN ve min 6 karakter şifre gir.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // refresh cookie vs için
        body: JSON.stringify({ username: personelId, password }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("← /auth/signup", res.status, data);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error || data?.message || `Kayıt başarısız (HTTP ${res.status})`
        );
      }

      setMessage("Kayıt başarılı! Şimdi aynı bilgilerle giriş yapabilirsin.");
    } catch (err: any) {
      console.error("signup error:", err);
      setMessage(err?.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  /** --------- LOGIN --------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetFeedback();
    if (!formValid) return;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 🔴 refresh cookie için şart
        body: JSON.stringify({ username: personelId, password }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Giriş başarısız");
      }

      // Access token'ı localStorage'a koy
      localStorage.setItem("auth_token", data.token);

      setMessage("Giriş başarılı.");
      window.location.replace("/dashboard");
    } catch (err: any) {
      setMessage(err?.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Card sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" gutterBottom>
          Personel Girişi
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Personel ID"
            variant="outlined"
            margin="normal"
            inputProps={{ inputMode: "numeric", pattern: "\\d{11}" }}
            value={personelId}
            onChange={onIdChange}
            onInput={resetFeedback}
            error={!isValidId && personelId.length > 0}
            helperText={
              !isValidId && personelId.length > 0 ? "ID 11 haneli olmalı." : " "
            }
          />

          <TextField
            fullWidth
            label="Şifre"
            variant="outlined"
            margin="normal"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onInput={resetFeedback}
            error={!isValidPass && password.length > 0}
            helperText={
              !isValidPass && password.length > 0
                ? "Şifre en az 6 karakter olmalı."
                : " "
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass((s) => !s)} edge="end">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Grid container spacing={2} mt={1}>
            <Grid item xs={6}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={!formValid}
              >
                Giriş Yap
              </Button>
            </Grid>

            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                disabled={!formValid || loading}
                type="button"
                onClick={handleSignup}
              >
                Kayıt Ol
              </Button>
            </Grid>
          </Grid>

          {message && (
            <Typography mt={2} color="secondary">
              {message}
            </Typography>
          )}
        </form>
      </Card>
    </Box>
  );
}
