import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Box,
  Typography,
  Divider,
  Stack,
  Button,
  TextField,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import dayjs from "dayjs";

function statusLabel(status: string) {
  if (!status) return "";
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "Açık";
    case "CLOSED":
      return "Kapalı";
    default:
      return status;
  }
}

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3001";

type CustomerAPI = {
  id: string;
  national_id?: string;
  serial_no?: string | null;
  first_name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: "E" | "K" | null;
  nationality?: "TR" | "YABANCI" | null;
  mother_name?: string | null;
  father_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  branch_no?: string | null;
};

type AccountAPI = {
  currency_code: string;
  balance: string;
  account_type: "VADESIZ" | "VADELI";
  interest_rate: string;
  sub_no: number | null;
  account_no: string;
  status: string;
  branch_code?: number | string;
};

type SummaryAPI = { customer: CustomerAPI; accounts: AccountAPI[] };

type CustomerInfo = {
  tckn?: string;
  ad?: string;
  soyad?: string;
  dogum?: string;
  cinsiyet?: "erkek" | "kadin";
  uyruk?: "turk" | "yabanci";
  anneAdi?: string;
  babaAdi?: string;
  adres?: string;
  telefon?: string;
  email?: string;
};

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>
        {value && value.trim() !== "" ? value : "—"}
      </Typography>
    </Box>
  );
}

export default function MusteriBilgiSorgulama() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tcknQuery, setTcknQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [customer, setCustomer] = useState<CustomerInfo | undefined>();
  const [accounts, setAccounts] = useState<AccountAPI[]>([]);
  const [notFound, setNotFound] = useState<boolean>(false);

  // ⬇️ ESKİ BİLGİYİ EKRANA BASMAYALIM: sadece TCKN'yi prefill et
  useEffect(() => {}, [location.state]);

  function mapCustomer(api: CustomerAPI): CustomerInfo {
    return {
      tckn: api.national_id || "",
      ad: api.first_name || "",
      soyad: api.last_name || "",
      dogum: api.birth_date || "",
      cinsiyet:
        api.gender === "K" ? "kadin" : api.gender === "E" ? "erkek" : undefined,
      uyruk:
        api.nationality === "YABANCI"
          ? "yabanci"
          : api.nationality === "TR"
          ? "turk"
          : undefined,
      anneAdi: api.mother_name || "",
      babaAdi: api.father_name || "",
      adres: api.address || "",
      telefon: api.phone || "",
      email: api.email || "",
    };
  }

  async function fetchSummary(tckn: string) {
    // Geçersiz TCKN: ekranı temizle
    if (!/^\d{11}$/.test(tckn)) {
      setErr("TCKN 11 haneli olmalı");
      setNotFound(false);
      setCustomer(undefined);
      setAccounts([]);
      return;
    }

    setErr("");
    setNotFound(false);
    setLoading(true);

    // Sorgu başında stale veriyi temizle
    setCustomer(undefined);
    setAccounts([]);

    try {
      const res = await fetch(
        `${API_BASE}/customers/summary?national_id=${tckn}`
      );
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true);
          throw new Error("Müşteri bulunamadı");
        }
        const data = await safeJson(res);
        throw new Error(data?.msg || `Hata: ${res.status}`);
      }
      const data: SummaryAPI = await res.json();
      setCustomer(mapCustomer(data.customer));
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setErr(e.message || "Beklenmeyen bir hata oluştu");
      // Hata/404: boş göster
      setCustomer(undefined);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  function onBack() {
    navigate(-1);
  }
  function onPrint() {
    window.print();
  }
  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: "100vh",
        py: 6,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <Stack spacing={3} sx={{ width: "60%" }}>
        {/* Başlık + Aksiyonlar */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h4">Müşteri Bilgi Sorgulama</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={onBack}
            >
              Geri Dön
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintRoundedIcon />}
              onClick={onPrint}
            >
              Yazdır
            </Button>
          </Stack>
        </Stack>

        {/* Arama kutusu */}
        <Card>
          <CardHeader title="TCKN girip sorgulayın" />
          <CardContent>
            <Stack direction="row" spacing={2}>
              <TextField
                label="TCKN / VKN (11 hane)"
                value={tcknQuery}
                onChange={(e) =>
                  setTcknQuery(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                inputProps={{ inputMode: "numeric", pattern: "\\d{11}" }}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                onClick={() => fetchSummary(tcknQuery)}
                disabled={loading}
              >
                {loading ? "Sorgulanıyor..." : "Sorgula"}
              </Button>
            </Stack>

            {err && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {err}
              </Alert>
            )}
            {notFound && !err && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Bu TCKN’ye ait aktif müşteri kaydı bulunamadı.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Müşteri Bilgileri */}
        <Card>
          <CardHeader
            avatar={<AccountCircleRoundedIcon color="primary" />}
            title="Müşteri Bilgileri"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="TCKN / VKN" value={customer?.tckn} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="Ad" value={customer?.ad} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="Soyad" value={customer?.soyad} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field
                  label="Doğum Tarihi"
                  value={
                    customer?.dogum
                      ? dayjs(customer.dogum).format("DD/MM/YYYY")
                      : ""
                  }
                />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field
                  label="Cinsiyet"
                  value={
                    customer?.cinsiyet
                      ? customer.cinsiyet === "kadin"
                        ? "Kadın"
                        : "Erkek"
                      : ""
                  }
                />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field
                  label="Uyruk"
                  value={
                    customer?.uyruk
                      ? customer.uyruk === "yabanci"
                        ? "Yabancı"
                        : "Türk"
                      : ""
                  }
                />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="Anne Adı" value={customer?.anneAdi} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="Baba Adı" value={customer?.babaAdi} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="Telefon" value={customer?.telefon} />
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <Field label="E-posta" value={customer?.email} />
              </Grid>
              <Grid item xs={12}>
                <Field label="Adres" value={customer?.adres} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Hesap Bilgileri */}
        <Card>
          <CardHeader
            avatar={<AccountBalanceWalletRoundedIcon color="primary" />}
            title="Hesap Bilgileri"
          />
          <CardContent>
            {accounts?.length ? (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hesap No</TableCell>
                      <TableCell>Şube No</TableCell>
                      <TableCell>Döviz</TableCell>
                      <TableCell align="right">Bakiye</TableCell>
                      <TableCell>Hesap Tipi</TableCell>
                      <TableCell align="right">Faiz (%)</TableCell>
                      <TableCell>Ek No</TableCell>
                      <TableCell>Durum</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.account_no}>
                        <TableCell>{a.account_no}</TableCell>
                        <TableCell>{a.branch_code ?? "—"}</TableCell>
                        <TableCell>{a.currency_code}</TableCell>
                        <TableCell align="right">{a.balance}</TableCell>
                        <TableCell>
                          {a.account_type === "VADELI" ? "Vadeli" : "Vadesiz"}
                        </TableCell>
                        <TableCell align="right">{a.interest_rate}</TableCell>
                        <TableCell>{a.sub_no ?? "—"}</TableCell>
                        <TableCell>{statusLabel(a.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: "block" }}
                >
                  Toplam hesap: {accounts.length}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">Hesap bulunamadı.</Typography>
            )}
            <Divider sx={{ mt: 2 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: "block" }}
            >
              Bu sayfa yalnızca görüntüleme amaçlıdır. Değerler API’dan çekilir.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
