import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Grid,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import TablePagination from "@mui/material/TablePagination";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:3001";

type Account = {
  id: number | string;
  account_no: string;
  currency_code: string;
  balance: number | string;
  account_type: "VADESIZ" | "VADELI";
  interest_rate?: number | string;
  status: string;
  branch_id?: number | string;
  created_at?: string;
};

type CustomerRow = {
  id: number | string;
  national_id?: string;
  first_name?: string;
  last_name?: string;
  branch_id?: number | string;
  accounts: Account[];
};

function formatMoney(val: number | string, ccy = "TRY") {
  const n = Number(val) || 0;
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${(n as any).toFixed ? (n as any).toFixed(2) : n} ${ccy}`;
  }
}

export default function SubeMusteriListesi() {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  const logout = () => {
    try {
      localStorage.removeItem("auth");
    } catch {}
    navigate("/", { replace: true });
  };

  // --- Filtreler ---
  const [branchId, setBranchId] = useState<string | number>(1); // 1 = merkez → tümü
  const [accountType, setAccountType] = useState<"" | "VADESIZ" | "VADELI">("");
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // --- Data + durum ---
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // --- Pagination ---
  const [page, setPage] = useState(0); // 0-index
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);

  // Döviz seçenekleri
  const currencies = ["", "TRY", "USD", "EUR", "GBP"];

  async function fetchData(customPage = page, customRpp = rowsPerPage) {
    setErr("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branch_id", String(branchId));
      if (accountType) params.set("account_type", accountType);
      if (currencyCode) params.set("currency_code", currencyCode);
      if (q.trim()) params.set("q", q.trim());

      params.set("limit", String(customRpp));
      params.set("offset", String(customPage * customRpp));

      const res = await fetch(
        `${API_BASE}/customers/by-branch?` + params.toString()
      );
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.msg || `Hata: ${res.status}`);
      }
      const data = await res.json();
      setRows(data.items || []);
      setTotal(Number(data.total ?? (data.items?.length || 0))); // total yoksa fallback
    } catch (e: any) {
      setErr(e.message || "Liste alınamadı");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(0, rowsPerPage); // ilk yükleme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtreler değiştiğinde sayfayı sıfırla ve tekrar çek
  useEffect(() => {
    setPage(0);
    fetchData(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, accountType, currencyCode, q]);

  function safeJson(r: Response) {
    return r.json().catch(() => null);
  }

  // Görsel hesaplama (hesap sayısı vb)
  const computed = useMemo(() => {
    return rows.map((r) => {
      const count = r.accounts?.length || 0;
      return { ...r, accountCount: count };
    });
  }, [rows]);

  // Pagination eventleri
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchData(newPage, rowsPerPage);
  };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rpp = parseInt(e.target.value, 10);
    setRowsPerPage(rpp);
    setPage(0);
    fetchData(0, rpp);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title="Şube Müşteri Listesi"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={goBack}
                >
                  Geri Dön
                </Button>
                <Button
                  variant="text"
                  color="error"
                  startIcon={<LogoutRoundedIcon />}
                  onClick={logout}
                >
                  Çıkış Yap
                </Button>
              </Stack>
            }
          />
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{ flexBasis: "16% !important", maxWidth: "16% !important" }}
              >
                <FormControl fullWidth>
                  <InputLabel id="branch-label">Şube</InputLabel>
                  <Select
                    labelId="branch-label"
                    label="Şube"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value as any)}
                  >
                    <MenuItem value={1}>1 - Merkez (tümü)</MenuItem>
                    <MenuItem value={2}>2 - Şube</MenuItem>
                    <MenuItem value={3}>3 - Şube</MenuItem>
                    <MenuItem value={4}>4 - Şube</MenuItem>
                    <MenuItem value={5}>5 - Şube</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{ flexBasis: "10% !important", maxWidth: "10% !important" }}
              >
                <FormControl fullWidth>
                  <InputLabel id="type-label">Hesap Tipi</InputLabel>
                  <Select
                    labelId="type-label"
                    label="Hesap Tipi"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                  >
                    <MenuItem value={""}>Hepsi</MenuItem>
                    <MenuItem value={"VADESIZ"}>Vadesiz</MenuItem>
                    <MenuItem value={"VADELI"}>Vadeli</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                sx={{ flexBasis: "8% !important", maxWidth: "8% !important" }}
              >
                <FormControl fullWidth>
                  <InputLabel id="ccy-label">Döviz</InputLabel>
                  <Select
                    labelId="ccy-label"
                    label="Döviz"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value as any)}
                  >
                    {currencies.map((c) => (
                      <MenuItem key={c || "all"} value={c}>
                        {c || "Hepsi"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Ara (TCKN/Ad/Soyad)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={() => fetchData(0, rowsPerPage)}
                    disabled={loading}
                  >
                    {loading ? "Yükleniyor..." : "Listele"}
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setAccountType("");
                      setCurrencyCode("");
                      setQ("");
                    }}
                  >
                    Filtreleri Sıfırla
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {err && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {err}
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Müşteriler"
            subheader="Şube ve filtrelere göre listelenir"
          />
          <CardContent>
            {computed.length === 0 ? (
              <Typography color="text.secondary">Kayıt bulunamadı.</Typography>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>TCKN</TableCell>
                      <TableCell>Ad Soyad</TableCell>
                      <TableCell>Şube ID</TableCell>
                      <TableCell align="right">Hesap Sayısı</TableCell>
                      <TableCell>Hesaplar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {computed.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.national_id}</TableCell>
                        <TableCell>
                          {row.first_name} {row.last_name}
                        </TableCell>
                        <TableCell>{row.branch_id ?? "—"}</TableCell>
                        <TableCell align="right">{row.accountCount}</TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Stack spacing={0.5}>
                            {row.accounts.slice(0, 3).map((a) => (
                              <Typography key={a.id} variant="body2">
                                <b>{a.account_no}</b> —{" "}
                                {a.account_type === "VADELI"
                                  ? "Vadeli"
                                  : "Vadesiz"}{" "}
                                —{" "}
                                {formatMoney(
                                  Number(a.balance) || 0,
                                  a.currency_code
                                )}
                              </Typography>
                            ))}
                            {row.accounts.length > 3 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                +{row.accounts.length - 3} hesap daha
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  labelRowsPerPage="Sayfa başına"
                />

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Toplam müşteri: {total}
                </Typography>
              </>
            )}
            <Divider sx={{ mt: 2 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: "block" }}
            >
              Merkez (1) tüm müşterileri getirir; diğer şubeler yalnızca kendi
              müşterilerini görür.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
