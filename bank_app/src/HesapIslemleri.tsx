import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Card, CardHeader, CardContent, Grid, Box, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Button, Divider,
  Typography, InputAdornment
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
    gunSayisi: "", // sadece UI hesap için
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // vadesizse faiz 0 kalsın
  useEffect(() => {
    if (form.hesapTipi === "vadesiz" && form.faiz !== "0") {
      setForm((f) => ({ ...f, faiz: "0" }));
    }
  }, [form.hesapTipi, form.faiz]);

  function onChange(e: any) {
    const { name, value } = e.target;

    if (name === "hesapTipi") {
      setForm((f) => ({
        ...f,
        hesapTipi: value,
        faiz: value === "vadesiz" ? "0" : f.faiz || "0",
      }));
      setMessage("");
      setErrors((p) => ({ ...p, hesapTipi: undefined as any, faiz: undefined as any }));
      return;
    }

    if (name === "tckn") {
      const v = value.replace(/\D/g, "").slice(0, 11);
      setForm((f) => ({ ...f, tckn: v }));
      setMessage("");
      setErrors((p) => ({ ...p, tckn: undefined as any }));
      return;
    }

    if (name === "bakiye") {
      const v = String(value).replace(",", ".");
      setForm((f) => ({ ...f, bakiye: v }));
      setMessage("");
      setErrors((p) => ({ ...p, bakiye: undefined as any }));
      return;
    }

    if (name === "faiz") {
      let v = String(value).replace(",", ".");
      if (v === "" || v === ".") {
        setForm((f) => ({ ...f, faiz: v }));
        setMessage("");
        setErrors((p) => ({ ...p, faiz: undefined as any }));
        return;
      }
      const num = Number(v);
      if (isNaN(num)) return;
      const clamped = Math.min(50, Math.max(0, num));
      setForm((f) => ({ ...f, faiz: String(clamped) }));
      setMessage("");
      setErrors((p) => ({ ...p, faiz: undefined as any }));
      return;
    }

    if (name === "gunSayisi") {
      const v = value.replace(/\D/g, "").slice(0, 5); // 0..99999 gün
      setForm((f) => ({ ...f, gunSayisi: v }));
      setMessage("");
      setErrors((p) => ({ ...p, gunSayisi: undefined as any }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
    setMessage("");
    setErrors((p) => ({ ...p, [name]: undefined as any }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!/^\d{11}$/.test(form.tckn)) e.tckn = "TCKN/VKN 11 haneli olmalı";
    if (!form.doviz) e.doviz = "Döviz kodu seçiniz";

    if (form.bakiye === "" || isNaN(Number(form.bakiye)) || Number(form.bakiye) < 0) {
      e.bakiye = "Geçerli bir bakiye giriniz";
    }

    if (!form.hesapTipi) e.hesapTipi = "Hesap tipi seçiniz";

    const faizNum = Number(form.faiz);
    if (form.hesapTipi === "vadesiz") {
      if (form.faiz !== "0") e.faiz = "Vadesiz hesapta faiz 0 olmalı";
    } else {
      if (form.faiz === "" || isNaN(faizNum) || faizNum < 0 || faizNum > 50) {
        e.faiz = "Faiz %0–50 arası olmalı";
      }
    }

    // gün sayısı opsiyonel; dolu ise kontrol et
    if (form.gunSayisi !== "") {
      const d = Number(form.gunSayisi);
      if (!Number.isInteger(d) || d < 0) e.gunSayisi = "Gün sayısı 0 veya pozitif tam sayı olmalı";
    }

    return e;
  }

  function toApiPayload() {
    return {
      national_id: form.tckn,
      currency_code: form.doviz,
      account_type: form.hesapTipi === "vadesiz" ? "VADESIZ" : "VADELI",
      balance: Number(form.bakiye),
      interest_rate: Number(form.faiz), // vadesizde 0
      // sub_no GÖNDERME → DB otomatik 01,02... atar
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

      const acc = data?.account || data;
      const ekNo = acc?.sub_no_str ?? acc?.sub_no;
      setMessage(
        `Hesap oluşturuldu. Ek No: ${String(ekNo ?? "").padStart(2, "0")}`
      );

      // TCKN ve bakiye reset; diğer tercihler kalsın
      setForm((f) => ({ ...f, tckn: "", bakiye: "" }));
    } catch (err: any) {
      setMessage(err.message || "Beklenmeyen bir hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function safeJson(res: Response) {
    try { return await res.json(); } catch { return null; }
  }

  function logout() {
    localStorage.removeItem("auth");
    navigate("/", { replace: true });
  }

  const faizDisabled = form.hesapTipi === "vadesiz";

  // --- Hesaplama (Basit faiz, 365 gün esası) ---
  const { hesaplananFaiz, toplamTutar } = useMemo(() => {
    const balance = Number(form.bakiye) || 0;
    const days = Number(form.gunSayisi) || 0;
    const rate = form.hesapTipi === "vadesiz" ? 0 : (Number(form.faiz) || 0);
    const faizTutari = balance * (rate / 100) * (days / 365);
    return {
      hesaplananFaiz: isFinite(faizTutari) ? faizTutari : 0,
      toplamTutar: isFinite(faizTutari) ? balance + faizTutari : balance,
    };
  }, [form.bakiye, form.gunSayisi, form.faiz, form.hesapTipi]);

  const formatMoney = (val: number) => {
    try {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: form.doviz || "TRY",
        maximumFractionDigits: 2,
      }).format(val);
    } catch {
      return `${val.toFixed(2)} ${form.doviz}`;
    }
  };

  return (
    <Container
      maxWidth="md"
      sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}
    >
      <Card sx={{ width: "60%" }}>
        <CardHeader
          title="Hesap Oluştur"
          action={
            <Button onClick={logout} color="error" startIcon={<LogoutRoundedIcon />}>
              Çıkış Yap
            </Button>
          }
        />
        <CardContent>
          <Box component="form" noValidate onSubmit={onSubmit}>
            <Grid container spacing={2}>
              {/* TCKN */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="TCKN / VKN (11 hane)" name="tckn" value={form.tckn} onChange={onChange}
                  error={!!errors.tckn} helperText={errors.tckn || " "}
                  inputProps={{ inputMode: "numeric", pattern: "\\d{11}" }}
                  placeholder="12345678901" sx={{ width: "13vw" }}
                />
              </Grid>

              {/* Hesap Tipi */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.hesapTipi}>
                  <InputLabel id="hesapTipi-label">Hesap Tipi</InputLabel>
                  <Select
                    labelId="hesapTipi-label" id="hesapTipi" name="hesapTipi"
                    value={form.hesapTipi} label="Hesap Tipi" onChange={onChange}
                    sx={{ width: "14vw" }}
                  >
                    <MenuItem value="vadesiz">Vadesiz</MenuItem>
                    <MenuItem value="vadeli">Vadeli</MenuItem>
                  </Select>
                  <Typography variant="caption" color="error">{errors.hesapTipi || " "}</Typography>
                </FormControl>
              </Grid>

              {/* Bakiye */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Bakiye Tutarı" name="bakiye" value={form.bakiye} onChange={onChange}
                  error={!!errors.bakiye} helperText={errors.bakiye || " "}
                  placeholder="0.00" inputProps={{ inputMode: "decimal" }}
                  sx={{ width: "13vw" }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">{form.doviz}</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Döviz */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.doviz}>
                  <InputLabel id="doviz-label">Döviz Kodu</InputLabel>
                  <Select
                    labelId="doviz-label" id="doviz" name="doviz" value={form.doviz}
                    label="Döviz Kodu" onChange={onChange} sx={{ width: "14vw" }}
                  >
                    <MenuItem value="TRY">TRY</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="GBP">GBP</MenuItem>
                  </Select>
                  <Typography variant="caption" color="error">{errors.doviz || " "}</Typography>
                </FormControl>
              </Grid>

              {/* Faiz */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Faiz Oranı" name="faiz" value={form.faiz} onChange={onChange}
                  error={!!errors.faiz}
                  helperText={errors.faiz || (faizDisabled ? "Vadesiz hesapta faiz 0’dır" : "0–50")}
                  placeholder="0" sx={{ width: "13vw" }} type="number"
                  inputProps={{ inputMode: "decimal", step: "0.01", min: 0, max: 50 }}
                  disabled={faizDisabled}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
              </Grid>

              {/* Gün Sayısı (UI hesap) */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Gün Sayısı" name="gunSayisi" value={form.gunSayisi} onChange={onChange}
                  error={!!errors.gunSayisi} helperText={errors.gunSayisi || "Basit faiz: 365 gün esas alınır"}
                  sx={{ width: "13vw" }} placeholder="Örn: 30" type="number"
                  inputProps={{ inputMode: "numeric", min: 0, step: 1 }}
                />
              </Grid>

              {/* Hesap Özeti (canlı) */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, width: "14vw" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Hesap Özeti
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      Bakiye: <b>{formatMoney(Number(form.bakiye || 0))}</b>
                    </Typography>
                    <Typography variant="body2">
                      Gün Sonu Faiz: <b>{formatMoney(hesaplananFaiz)}</b>
                    </Typography>
                    <Divider flexItem sx={{ my: 0.5 }} />
                    <Typography variant="body2">
                      Toplam: <b>{formatMoney(toplamTutar)}</b>
                    </Typography>
                  </Stack>
                </Card>
              </Grid>

              {/* Butonlar + Mesaj */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="space-between">
                  <Button type="button" variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
                    Geri Dön
                  </Button>
                  <Button type="submit" variant="contained" endIcon={<CheckCircleRoundedIcon />} disabled={saving}>
                    {saving ? "Kaydediliyor..." : "Hesabı Oluştur"}
                  </Button>
                </Stack>
              </Grid>

              {message && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography color={message.startsWith("Hata") ? "error" : "success.main"}>
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
