import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  Divider,
  Typography,
  InputAdornment,
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3001";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function onChange(e: any) {
    const { name, value } = e.target;
    let v = value;
    if (name === "tckn") v = value.replace(/\D/g, "").slice(0, 11);
    if (name === "bakiye") v = String(v).replace(",", ".");
    if (name === "faiz") v = String(v).replace(",", ".");
    if (name === "ekNo") v = value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, [name]: v }));
    setMessage("");
    setErrors((prev) => ({ ...prev, [name]: undefined as any }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!/^\d{11}$/.test(form.tckn)) e.tckn = "TCKN/VKN 11 haneli olmalı";
    if (!form.doviz) e.doviz = "Döviz kodu seçiniz";
    if (
      form.bakiye === "" ||
      isNaN(Number(form.bakiye)) ||
      Number(form.bakiye) < 0
    )
      e.bakiye = "Geçerli bir bakiye giriniz";
    if (!form.hesapTipi) e.hesapTipi = "Hesap tipi seçiniz";
    const faizNum = Number(form.faiz);
    if (isNaN(faizNum) || faizNum < 0 || faizNum > 100)
      e.faiz = "Faiz %0–100 arası olmalı";
    if (!form.ekNo || form.ekNo.length < 1) e.ekNo = "Hesap ek no giriniz";
    return e;
  }

  function toApiPayload() {
    return {
      national_id: form.tckn,
      currency_code: form.doviz,
      account_type: form.hesapTipi === "vadesiz" ? "VADESIZ" : "VADELI",
      balance: Number(form.bakiye),
      interest_rate: Number(form.faiz),
      sub_no: Number(form.ekNo),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload()),
      });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.msg || `Hata: ${res.status}`);
      }

      setMessage(`Hesap oluşturuldu.`);
      // TCKN ve ekNo sıfırlansın, diğerleri kullanıcı tercihine kalsın
      setForm((f) => ({ ...f, tckn: "", ekNo: "", bakiye: "" }));
    } catch (err: any) {
      setMessage(err.message || "Beklenmeyen bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
      }}
    >
      <Card sx={{ width: "60%" }}>
        <CardHeader
          title="Hesap Oluştur"
          action={
            <Button
              onClick={logout}
              color="error"
              startIcon={<LogoutRoundedIcon />}
            >
              Çıkış Yap
            </Button>
          }
        />
        <CardContent>
          <Box component="form" noValidate onSubmit={onSubmit}>
            <Grid container spacing={2}>
              {/* TCKN & Döviz */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="TCKN / VKN (11 hane)"
                  name="tckn"
                  value={form.tckn}
                  onChange={onChange}
                  error={!!errors.tckn}
                  helperText={errors.tckn || " "}
                  inputProps={{ inputMode: "numeric", pattern: "\\d{11}" }}
                  placeholder="12345678901"
                  sx={{ width: "13vw" }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.hesapTipi}>
                  <InputLabel id="hesapTipi-label">Hesap Tipi</InputLabel>
                  <Select
                    labelId="hesapTipi-label"
                    id="hesapTipi"
                    name="hesapTipi"
                    value={form.hesapTipi}
                    label="Hesap Tipi"
                    onChange={onChange}
                    sx={{ width: "14vw" }}
                    
                  >
                    <MenuItem value="vadesiz">Vadesiz</MenuItem>
                    <MenuItem value="vadeli">Vadeli</MenuItem>
                  </Select>
                  <Typography variant="caption" color="error">
                    {errors.hesapTipi || " "}
                  </Typography>
                </FormControl>
              </Grid>

              {/* Bakiye & Hesap Tipi */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Bakiye Tutarı"
                  name="bakiye"
                  value={form.bakiye}
                  onChange={onChange}
                  error={!!errors.bakiye}
                  helperText={errors.bakiye || " "}
                  placeholder="0.00"
                  inputProps={{ inputMode: "decimal" }}
                  sx={{ width: "13vw" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {form.doviz}
                      </InputAdornment>
                      
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.doviz}>
                  <InputLabel id="doviz-label">Döviz Kodu</InputLabel>
                  <Select
                    labelId="doviz-label"
                    id="doviz"
                    name="doviz"
                    value={form.doviz}
                    label="Döviz Kodu"
                    onChange={onChange}
                    sx={{ width: "14vw" }}
                  >
                    <MenuItem value="TRY">TRY</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                  <Typography variant="caption" color="error">
                    {errors.doviz || " "}
                  </Typography>
                </FormControl>
              </Grid>

              {/* Faiz & Ek No */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Faiz Oranı"
                  name="faiz"
                  value={form.faiz}
                  onChange={onChange}
                  error={!!errors.faiz}
                  helperText={errors.faiz || " "}
                  placeholder="0"
                  sx={{ width: "13vw" }}
                  inputProps={{ inputMode: "decimal" }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hesap Ek No"
                  name="ekNo"
                  value={form.ekNo}
                  onChange={onChange}
                  error={!!errors.ekNo}
                  helperText={errors.ekNo || " "}
                  sx={{ width: "14vw" }}
                  placeholder="Örn: 001"
                  inputProps={{ inputMode: "numeric" }}
                />
              </Grid>

              {/* Butonlar + Mesaj */}
              <Grid item xs={12}>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="space-between"
                >
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => navigate(-1)}
                  >
                    Geri Dön
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<CheckCircleRoundedIcon />}
                    disabled={saving}
                  >
                    {saving ? "Kaydediliyor..." : "Hesabı Oluştur"}
                  </Button>
                </Stack>
              </Grid>

              {message && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    color={
                      message.startsWith("Hata") ? "error" : "success.main"
                    }
                  >
                    {message}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
