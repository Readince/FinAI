import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

// MUI Core
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Box,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Button,
  Divider,
  Typography,
  Switch, // <-- eklendi
} from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

// MUI X Date Pickers
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// MUI Lab
import { LoadingButton } from "@mui/lab";

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3001";

export default function YeniMusteri() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tckn: "",
    ad: "",
    soyad: "",
    dogum: null as any, // dayjs objesi
    cinsiyet: "",
    seriNo: "",
    uyruk: "",
    anneAdi: "",
    babaAdi: "",
    telefon: "",
    email: "",
    adres: "",
    openDefaultAccount: true, // <-- eklendi (varsayılan: açık)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function onChange(e: any) {
    const { name, value } = e.target;
    let v = value;

    if (name === "tckn") {
      v = value.replace(/\D/g, "").slice(0, 11); // sadece rakam/11 hane
    }

    setForm((f) => ({ ...f, [name]: v }));
    setMessage("");
    setErrors((prev) => ({ ...prev, [name]: undefined as any }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!/^\d{11}$/.test(form.tckn)) e.tckn = "TCKN/VKN 11 haneli olmalı";
    if (!form.ad.trim()) e.ad = "Ad gerekli";
    if (!form.soyad.trim()) e.soyad = "Soyad gerekli";
    if (!form.dogum) e.dogum = "Doğum tarihi gerekli";
    if (!form.cinsiyet) e.cinsiyet = "Cinsiyet seçiniz";
    if (!form.seriNo.trim()) e.seriNo = "Seri no gerekli";
    if (!form.uyruk) e.uyruk = "Uyruk seçiniz";
    if (!form.anneAdi.trim()) e.anneAdi = "Anne adı gerekli";
    if (!form.babaAdi.trim()) e.babaAdi = "Baba adı gerekli";
    if (!/^\+?\d[\d\s-]{7,}$/.test(form.telefon.trim()))
      e.telefon = "Geçerli bir telefon girin";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "Geçerli bir e-posta girin";
    if (!form.adres.trim()) e.adres = "Adres gerekli";
    return e;
  }

  // frontend -> backend alan dönüşümü
  function toApiPayload() {
    return {
      national_id: form.tckn,
      serial_no: form.seriNo || null,
      first_name: form.ad,
      last_name: form.soyad,
      phone: form.telefon || null,
      email: form.email || null,
      birth_date: form.dogum ? dayjs(form.dogum).format("YYYY-MM-DD") : null,
      gender:
        form.cinsiyet === "erkek"
          ? "E"
          : form.cinsiyet === "kadin"
          ? "K"
          : null,
      nationality:
        form.uyruk === "turk"
          ? "TR"
          : form.uyruk === "yabanci"
          ? "YABANCI"
          : null,
      mother_name: form.anneAdi || null,
      father_name: form.babaAdi || null,
      address: form.adres || null,
      branch_no: null,
      // kritik: backend'in beklediği anahtar
      open_default_account: !!form.openDefaultAccount, // <-- eklendi
    };
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // auth kapalı olduğu için Authorization header yok
        body: JSON.stringify(toApiPayload()),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg = data?.msg || `Hata: ${res.status}`;
        throw new Error(msg);
      }

      // Beklenen cevap: { customer, default_account }
      const customerId = data?.customer?.id ?? data?.id ?? "?";
      const ekNo =
        data?.default_account?.sub_no_str ??
        data?.default_account?.sub_no ??
        null;

      setMessage(
        ekNo
          ? `Müşteri oluşturuldu (ID: ${customerId}). Varsayılan vadesiz TRY hesap açıldı — Ek No: ${String(
              ekNo
            ).padStart(2, "0")}.`
          : `Müşteri oluşturuldu (ID: ${customerId}).`
      );

      // formu sıfırla (switch'i aynı bırakmak istersen onu koruyoruz)
      setForm((f) => ({
        tckn: "",
        ad: "",
        soyad: "",
        dogum: null as any,
        cinsiyet: "",
        seriNo: "",
        uyruk: "",
        anneAdi: "",
        babaAdi: "",
        telefon: "",
        email: "",
        adres: "",
        openDefaultAccount: f.openDefaultAccount, // tercih korunuyor
      }));
      setErrors({});
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container
        maxWidth="lg"
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
        }}
      >
        <Card sx={{ width: "40%" }}>
          <CardHeader
            title="Yeni Müşteri Kaydı"
            action={
              <Button
                onClick={logout}
                startIcon={<LogoutRoundedIcon />}
                color="error"
              >
                Çıkış Yap
              </Button>
            }
          />

          <CardContent>
            <Box component="form" noValidate onSubmit={onSubmit}>
              <Grid container spacing={2}>
                {/* Kimlik */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="TCKN / VKN (11 hane)"
                    name="tckn"
                    value={form.tckn}
                    onChange={onChange}
                    error={!!errors.tckn}
                    helperText={errors.tckn || " "}
                    placeholder="12345678901"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Seri No"
                    name="seriNo"
                    value={form.seriNo}
                    onChange={onChange}
                    error={!!errors.seriNo}
                    helperText={errors.seriNo || " "}
                    placeholder="Örn: A12B34"
                  />
                </Grid>

                {/* Ad Soyad */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Ad"
                    name="ad"
                    value={form.ad}
                    onChange={onChange}
                    error={!!errors.ad}
                    helperText={errors.ad || " "}
                    placeholder="Alirıza"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Soyad"
                    name="soyad"
                    value={form.soyad}
                    onChange={onChange}
                    error={!!errors.soyad}
                    helperText={errors.soyad || " "}
                    placeholder="Pamuk"
                  />
                </Grid>

                {/* Telefon & E-posta */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefon"
                    name="telefon"
                    value={form.telefon}
                    onChange={onChange}
                    error={!!errors.telefon}
                    helperText={errors.telefon || " "}
                    placeholder="5xx xxx xx xx"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="E-posta"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    error={!!errors.email}
                    helperText={errors.email || " "}
                    placeholder="ornek@gmail.com"
                  />
                </Grid>

                {/* Doğum Tarihi */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Doğum Tarihi"
                    value={form.dogum}
                    onChange={(val) => {
                      setForm((f) => ({ ...f, dogum: val }));
                      setMessage("");
                      setErrors((prev) => ({
                        ...prev,
                        dogum: undefined as any,
                      }));
                    }}
                    sx={{ width: "24.5vw" }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.dogum,
                        helperText: errors.dogum || " ",
                      },
                    }}
                  />
                </Grid>

                {/* Cinsiyet */}
                <Grid item xs={12} md={6}>
                  <FormControl error={!!errors.cinsiyet} fullWidth>
                    <FormLabel>Cinsiyet</FormLabel>
                    <RadioGroup
                      row
                      name="cinsiyet"
                      value={form.cinsiyet}
                      onChange={onChange}
                    >
                      <FormControlLabel
                        value="erkek"
                        control={<Radio />}
                        label="Erkek"
                      />
                      <FormControlLabel
                        value="kadin"
                        control={<Radio />}
                        label="Kadın"
                      />
                    </RadioGroup>
                    <Typography variant="caption" color="error">
                      {errors.cinsiyet || " "}
                    </Typography>
                  </FormControl>
                </Grid>

                {/* Uyruk */}
                <Grid item xs={12} md={6}>
                  <FormControl error={!!errors.uyruk} fullWidth>
                    <FormLabel>Uyruk</FormLabel>
                    <RadioGroup
                      row
                      name="uyruk"
                      value={form.uyruk}
                      onChange={onChange}
                    >
                      <FormControlLabel
                        value="turk"
                        control={<Radio />}
                        label="Türk"
                      />
                      <FormControlLabel
                        value="yabanci"
                        control={<Radio />}
                        label="Yabancı"
                      />
                    </RadioGroup>
                    <Typography variant="caption" color="error">
                      {errors.uyruk || " "}
                    </Typography>
                  </FormControl>
                </Grid>

                {/* Anne/Baba Adı */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Anne Adı"
                    name="anneAdi"
                    value={form.anneAdi}
                    onChange={onChange}
                    error={!!errors.anneAdi}
                    helperText={errors.anneAdi || " "}
                    placeholder="Örn: Nihal"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Baba Adı"
                    name="babaAdi"
                    value={form.babaAdi}
                    onChange={onChange}
                    error={!!errors.babaAdi}
                    helperText={errors.babaAdi || " "}
                    placeholder="Örn: Ahmet"
                  />
                </Grid>

                {/* Adres */}
                <Grid
                  item
                  xs={12}
                  md={12}
                  sx={{
                    flexBasis: "98% !important",
                    maxWidth: "98% !important",
                  }}
                >
                  <TextField
                    label="Adres"
                    name="adres"
                    value={form.adres}
                    onChange={onChange}
                    error={!!errors.adres}
                    helperText={errors.adres || " "}
                    placeholder="İl/İlçe, Mahalle, Sokak "
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Grid>

                {/* Varsayılan vadesiz TRY hesabı */}
                <Grid item xs={12} md={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.openDefaultAccount}
                        onChange={(_, v) =>
                          setForm((f) => ({ ...f, openDefaultAccount: v }))
                        }
                      />
                    }
                    label="Müşteri oluşturulunca 0 TL Vadesiz TRY hesabı açılsın"
                  />
                </Grid>

                {/* Butonlar */}
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

                    <LoadingButton
                      type="submit"
                      variant="contained"
                      loading={saving}
                      loadingPosition="end"
                      endIcon={<CheckCircleRoundedIcon />}
                    >
                      Kaydı Oluştur
                    </LoadingButton>
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
    </LocalizationProvider>
  );
}
